import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState
} from "expo-audio";

type Campaign = {
  id: string;
  name: string;
  system: string;
  description: string;
  updated_at: string;
};

type Session = {
  id: string;
  campaign_id: string;
  title: string;
  status: "idle" | "recording" | "processing" | "complete";
  started_at: string;
  ended_at?: string | null;
  short_summary?: string | null;
};

type CampaignListResponse = {
  items: Campaign[];
};

type SessionListResponse = {
  items: Session[];
};

type SessionAudioUploadResponse = {
  session_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  uploaded_at: string;
};

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://127.0.0.1:8000");

const liveMoments = [
  "Campaigns and sessions load from the API",
  "You can create a campaign from the app",
  "You can start a backend session record",
  "You can record audio and upload it to the API stub"
];

function showMessage(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

function formatDuration(seconds: number) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export default function App() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 250);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [campaignName, setCampaignName] = useState("");
  const [campaignSystem, setCampaignSystem] = useState("D&D 5e");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [sessionTitle, setSessionTitle] = useState("New Session");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [lastUpload, setLastUpload] = useState<SessionAudioUploadResponse | null>(null);
  const [error, setError] = useState<string>("");

  async function loadData() {
    try {
      setIsLoading(true);
      setError("");

      const [campaignResponse, sessionResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/campaigns`),
        fetch(`${API_BASE_URL}/sessions`)
      ]);

      if (!campaignResponse.ok || !sessionResponse.ok) {
        throw new Error("The API responded with an unexpected status.");
      }

      const campaignPayload = (await campaignResponse.json()) as CampaignListResponse;
      const sessionPayload = (await sessionResponse.json()) as SessionListResponse;

      setCampaigns(campaignPayload.items);
      setSessions(sessionPayload.items);

      if (!selectedCampaignId && campaignPayload.items.length > 0) {
        setSelectedCampaignId(campaignPayload.items[0].id);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not reach the API. Make sure the FastAPI server is running."
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!selectedCampaignId) {
      setSelectedSessionId("");
      return;
    }

    const campaignSessions = sessions.filter((session) => session.campaign_id === selectedCampaignId);
    if (campaignSessions.length === 0) {
      setSelectedSessionId("");
      return;
    }

    const stillExists = campaignSessions.some((session) => session.id === selectedSessionId);
    if (!stillExists) {
      setSelectedSessionId(campaignSessions[0].id);
    }
  }, [selectedCampaignId, selectedSessionId, sessions]);

  async function handleCreateCampaign() {
    if (!campaignName.trim()) {
      showMessage("Campaign name needed", "Enter a campaign name before creating it.");
      return;
    }

    try {
      setIsCreatingCampaign(true);

      const response = await fetch(`${API_BASE_URL}/campaigns`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: campaignName.trim(),
          system: campaignSystem.trim() || "Custom RPG",
          description: campaignDescription.trim()
        })
      });

      if (!response.ok) {
        throw new Error("The campaign could not be created.");
      }

      const createdCampaign = (await response.json()) as Campaign;
      setCampaigns((currentCampaigns) => [...currentCampaigns, createdCampaign]);
      setSelectedCampaignId(createdCampaign.id);
      setCampaignName("");
      setCampaignDescription("");
      showMessage("Campaign created", `${createdCampaign.name} is ready for sessions.`);
    } catch (createError) {
      showMessage(
        "Campaign creation failed",
        createError instanceof Error ? createError.message : "Please try again."
      );
    } finally {
      setIsCreatingCampaign(false);
    }
  }

  async function handleStartSession() {
    if (!selectedCampaignId) {
      showMessage("Select a campaign", "Create or choose a campaign before starting a session.");
      return;
    }

    try {
      setIsCreatingSession(true);

      const response = await fetch(`${API_BASE_URL}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          campaign_id: selectedCampaignId,
          title: sessionTitle.trim() || "New Session"
        })
      });

      if (!response.ok) {
        throw new Error("The session could not be started.");
      }

      const createdSession = (await response.json()) as Session;
      setSessions((currentSessions) => [createdSession, ...currentSessions]);
      setSelectedSessionId(createdSession.id);
      setSessionTitle("New Session");
      showMessage("Session started", `${createdSession.title} is now marked as recording.`);
    } catch (createError) {
      showMessage(
        "Session start failed",
        createError instanceof Error ? createError.message : "Please try again."
      );
    } finally {
      setIsCreatingSession(false);
    }
  }

  async function handleToggleRecording() {
    try {
      if (recorderState.isRecording) {
        await recorder.stop();
        await setAudioModeAsync({ allowsRecording: false });
        showMessage("Recording stopped", "Your audio clip is ready to upload.");
        return;
      }

      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        showMessage(
          "Microphone permission needed",
          "Allow microphone access so DungeonMate can capture session audio."
        );
        return;
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (recordingError) {
      showMessage(
        "Recording failed",
        recordingError instanceof Error ? recordingError.message : "Please try again."
      );
    }
  }

  async function handleUploadAudio() {
    if (!selectedSessionId) {
      showMessage("Select a session", "Start or select a session before uploading audio.");
      return;
    }

    if (!recorder.uri) {
      showMessage("No recording yet", "Record and stop a clip before uploading it.");
      return;
    }

    try {
      setIsUploadingAudio(true);

      const formData = new FormData();
      if (Platform.OS === "web") {
        const blob = await fetch(recorder.uri).then((response) => response.blob());
        formData.append("file", blob, "session-audio.webm");
      } else {
        formData.append("file", {
          uri: recorder.uri,
          name: "session-audio.m4a",
          type: "audio/m4a"
        } as unknown as Blob);
      }

      const response = await fetch(`${API_BASE_URL}/sessions/${selectedSessionId}/audio`, {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error("The audio clip could not be uploaded.");
      }

      const uploadPayload = (await response.json()) as SessionAudioUploadResponse;
      setLastUpload(uploadPayload);
      showMessage(
        "Audio uploaded",
        `${uploadPayload.filename} uploaded for ${uploadPayload.session_id} (${uploadPayload.size_bytes} bytes).`
      );
    } catch (uploadError) {
      showMessage(
        "Upload failed",
        uploadError instanceof Error ? uploadError.message : "Please try again."
      );
    } finally {
      setIsUploadingAudio(false);
    }
  }

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId);
  const recentSessions = selectedCampaignId
    ? sessions.filter((session) => session.campaign_id === selectedCampaignId)
    : sessions;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>DungeonMate</Text>
          <Text style={styles.title}>Stay in the moment. Let the app remember the session.</Text>
          <Text style={styles.subtitle}>
            The app now talks to your local API, creates sessions, and can capture a microphone
            recording for upload.
          </Text>
          <Text style={styles.helperText}>API base URL: {API_BASE_URL}</Text>
          <View style={styles.heroActions}>
            <TouchableOpacity
              disabled={isCreatingSession}
              onPress={handleStartSession}
              style={[styles.primaryButton, isCreatingSession && styles.buttonDisabled]}
            >
              <Text style={styles.primaryButtonText}>
                {isCreatingSession ? "Starting..." : "Start Session"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void loadData()} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Refresh Data</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Live Session Assist</Text>
          <View style={styles.panel}>
            <Text style={styles.panelLabel}>Current Phase</Text>
            <Text style={styles.summaryText}>
              We now have the first end-to-end media path: create a session, record a short clip, and
              upload it to the API for processing.
            </Text>
            <Text style={styles.panelLabel}>Recent Progress</Text>
            {liveMoments.map((moment) => (
              <View key={moment} style={styles.momentChip}>
                <Text style={styles.momentChipText}>{moment}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create Campaign</Text>
          <View style={styles.formCard}>
            <TextInput
              onChangeText={setCampaignName}
              placeholder="Campaign name"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
              value={campaignName}
            />
            <TextInput
              onChangeText={setCampaignSystem}
              placeholder="System"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
              value={campaignSystem}
            />
            <TextInput
              multiline
              onChangeText={setCampaignDescription}
              placeholder="Description"
              placeholderTextColor={colors.placeholder}
              style={[styles.input, styles.textArea]}
              value={campaignDescription}
            />
            <TouchableOpacity
              disabled={isCreatingCampaign}
              onPress={handleCreateCampaign}
              style={[styles.primaryButton, isCreatingCampaign && styles.buttonDisabled]}
            >
              <Text style={styles.primaryButtonText}>
                {isCreatingCampaign ? "Creating..." : "Create Campaign"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Campaigns</Text>
          {isLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.loadingText}>Loading campaigns from the API...</Text>
            </View>
          ) : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {campaigns.map((campaign) => {
            const isSelected = campaign.id === selectedCampaignId;
            return (
              <TouchableOpacity
                key={campaign.id}
                onPress={() => setSelectedCampaignId(campaign.id)}
                style={[styles.campaignCard, isSelected && styles.selectedCard]}
              >
                <View style={styles.campaignHeader}>
                  <Text style={styles.campaignName}>{campaign.name}</Text>
                  <Text style={styles.campaignSystem}>{campaign.system}</Text>
                </View>
                <Text style={styles.campaignSummary}>{campaign.description || "No description yet."}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Start Session For Selected Campaign</Text>
          <View style={styles.formCard}>
            <Text style={styles.selectionText}>
              {selectedCampaign
                ? `Selected campaign: ${selectedCampaign.name}`
                : "Select a campaign below to start a session."}
            </Text>
            <TextInput
              onChangeText={setSessionTitle}
              placeholder="Session title"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
              value={sessionTitle}
            />
            <TouchableOpacity
              disabled={isCreatingSession || !selectedCampaignId}
              onPress={handleStartSession}
              style={[styles.primaryButton, (!selectedCampaignId || isCreatingSession) && styles.buttonDisabled]}
            >
              <Text style={styles.primaryButtonText}>
                {isCreatingSession ? "Starting..." : "Start Session"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session Recorder</Text>
          <View style={styles.formCard}>
            <Text style={styles.selectionText}>
              {selectedSessionId
                ? `Selected session: ${selectedSessionId}`
                : "Start or select a session before recording."}
            </Text>
            <Text style={styles.recordingTimer}>
              {recorderState.isRecording
                ? `Recording ${formatDuration(recorderState.durationMillis / 1000)}`
                : `Ready ${formatDuration(recorderState.durationMillis / 1000)}`}
            </Text>
            <View style={styles.heroActions}>
              <TouchableOpacity onPress={handleToggleRecording} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>
                  {recorderState.isRecording ? "Stop Recording" : "Start Recording"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={isUploadingAudio || !recorder.uri || recorderState.isRecording || !selectedSessionId}
                onPress={handleUploadAudio}
                style={[
                  styles.secondaryButton,
                  (isUploadingAudio || !recorder.uri || recorderState.isRecording || !selectedSessionId) &&
                    styles.buttonDisabled
                ]}
              >
                <Text style={styles.secondaryButtonText}>
                  {isUploadingAudio ? "Uploading..." : "Upload Clip"}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>
              {recorder.uri ? `Recorded file ready: ${recorder.uri}` : "No clip recorded yet."}
            </Text>
            {lastUpload ? (
              <Text style={styles.uploadMeta}>
                Last upload: {lastUpload.filename} ({lastUpload.size_bytes} bytes)
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>
          {recentSessions.length === 0 ? (
            <View style={styles.panel}>
              <Text style={styles.summaryText}>No sessions yet for this campaign.</Text>
            </View>
          ) : (
            recentSessions.map((session) => {
              const isSelected = session.id === selectedSessionId;
              return (
                <TouchableOpacity
                  key={session.id}
                  onPress={() => setSelectedSessionId(session.id)}
                  style={[styles.sessionCard, isSelected && styles.selectedCard]}
                >
                  <View style={styles.sessionHeader}>
                    <Text style={styles.sessionTitle}>{session.title}</Text>
                    <Text style={styles.sessionStatus}>{session.status}</Text>
                  </View>
                  <Text style={styles.sessionSummary}>
                    {session.short_summary ||
                      "Session started. Transcript and recap generation will come later."}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const colors = {
  background: "#f7efe3",
  card: "#fffaf2",
  accent: "#0d5c63",
  accentSoft: "#d8ece7",
  ink: "#132a2f",
  muted: "#5b6b73",
  warm: "#cc7a00",
  border: "#ead9bf",
  selected: "#eef8f4",
  danger: "#a6382b",
  placeholder: "#8d9ca2"
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    padding: 20,
    gap: 18
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 4
  },
  eyebrow: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: colors.warm,
    marginBottom: 8,
    fontWeight: "700"
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "800",
    color: colors.ink
  },
  subtitle: {
    marginTop: 12,
    fontSize: 16,
    lineHeight: 24,
    color: colors.muted
  },
  helperText: {
    marginTop: 10,
    fontSize: 13,
    color: colors.muted
  },
  heroActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
    flexWrap: "wrap"
  },
  primaryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700"
  },
  secondaryButton: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14
  },
  secondaryButtonText: {
    color: colors.accent,
    fontWeight: "700"
  },
  buttonDisabled: {
    opacity: 0.6
  },
  section: {
    gap: 12
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink
  },
  panel: {
    backgroundColor: "#fffdf9",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10
  },
  panelLabel: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.muted,
    fontWeight: "700"
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 23,
    color: colors.ink
  },
  momentChip: {
    backgroundColor: colors.accentSoft,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: "flex-start"
  },
  momentChipText: {
    color: colors.accent,
    fontWeight: "600"
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12
  },
  input: {
    backgroundColor: "#fffdf9",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.ink
  },
  textArea: {
    minHeight: 92,
    textAlignVertical: "top"
  },
  loadingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fffdf9",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border
  },
  loadingText: {
    color: colors.muted,
    fontSize: 15
  },
  errorText: {
    color: colors.danger,
    fontSize: 15
  },
  campaignCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8
  },
  selectedCard: {
    backgroundColor: colors.selected,
    borderColor: colors.accent
  },
  campaignHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  campaignName: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
    flex: 1
  },
  campaignSystem: {
    fontSize: 14,
    color: colors.warm,
    fontWeight: "700"
  },
  campaignSummary: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted
  },
  selectionText: {
    fontSize: 15,
    color: colors.muted
  },
  recordingTimer: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.accent
  },
  uploadMeta: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: "700"
  },
  sessionCard: {
    backgroundColor: "#fffdf9",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  sessionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.ink,
    flex: 1
  },
  sessionStatus: {
    textTransform: "uppercase",
    color: colors.accent,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.8
  },
  sessionSummary: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted
  }
});
