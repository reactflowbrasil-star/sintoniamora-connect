import { getSession, rest } from "@/lib/supabase";

export type OnboardingState = Record<string, boolean>;

const key = (uid: string) => `sintoniamora:onboarding:${uid}`;

export function readLocal(uid: string): OnboardingState {
  try {
    return JSON.parse(localStorage.getItem(key(uid)) || "{}") as OnboardingState;
  } catch {
    return {};
  }
}

/** Loads from the user's profile (when available) merged over the local copy. */
export async function loadOnboarding(uid: string): Promise<OnboardingState> {
  const local = readLocal(uid);
  try {
    const rows = await rest<Array<{ onboarding: OnboardingState | null }>>(
      "profiles",
      `id=eq.${uid}&select=onboarding`,
    );
    const remote = rows?.[0]?.onboarding ?? {};
    const merged = { ...remote, ...local };
    localStorage.setItem(key(uid), JSON.stringify(merged));
    return merged;
  } catch {
    return local;
  }
}

export async function saveOnboarding(uid: string, state: OnboardingState) {
  localStorage.setItem(key(uid), JSON.stringify(state));
  if (getSession()?.user.id !== uid) return;
  try {
    await rest("profiles", `id=eq.${uid}`, {
      method: "PATCH",
      body: JSON.stringify({ onboarding: state }),
    });
  } catch {
    // Local copy remains the fallback.
  }
}
