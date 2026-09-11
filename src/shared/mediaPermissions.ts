const MEDIA_PERMISSIONS = {
  permissions: ["camera", "microphone"],
} as unknown as chrome.permissions.Permissions;

export async function requestMediaPermissions(): Promise<void> {
  try {
    if (chrome.permissions?.request) {
      await chrome.permissions.request(MEDIA_PERMISSIONS);
    }
  } catch {
    // getUserMedia still prompts if optional permission was skipped
  }
}
