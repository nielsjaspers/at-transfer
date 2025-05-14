import { BrowserOAuthClient } from '@atproto/oauth-client-browser'
import { Agent } from '@atproto/api'

const BLUESKY_HANDLE_RESOLVER = 'https://bsky.social'

let oauthClient = null
let session = null
let agent = null

/**
 * Initialize the OAuth client and restore session if available.
 * Returns { loggedIn: boolean, session, agent }
 */
export async function initOAuth() {
  oauthClient = new BrowserOAuthClient({
    handleResolver: BLUESKY_HANDLE_RESOLVER,
    // For localhost dev, no clientMetadata needed.
    // For production, see package docs for client_id/client_metadata.
  })

  // This will restore session if available or handle OAuth callback.
  const result = await oauthClient.init()
  if (result && result.session) {
    session = result.session
    agent = new Agent(session)
    return { loggedIn: true, session, agent }
  }
  session = null
  agent = null
  return { loggedIn: false }
}

/**
 * Start OAuth login flow. Requires a handle or DID.
 * This will redirect to Bluesky for authentication.
 */
export async function startOAuthLogin(handleOrDid) {
  if (!oauthClient) throw new Error('OAuth client not initialized')
  await oauthClient.signIn(handleOrDid)
  // This will redirect, so code after this will not run.
}

/**
 * Logout and clear session.
 */
export async function logout() {
  if (oauthClient && session) {
    await oauthClient.signOut(session.sub)
  }
  session = null
  agent = null
}

/**
 * Get the current session (or null if not logged in).
 */
export function getSession() {
  return session
}

/**
 * Get the current Agent (or null if not logged in).
 */
export function getAgent() {
  return agent
}

/**
 * Get the current user's DID (or null if not logged in).
 */
export function getCurrentDid() {
  return session ? session.sub : null
}

/**
 * Get the current user's handle (or null if not logged in).
 */
export function getCurrentHandle() {
  return session ? session.handle : null
}

/**
 * Returns true if the user is logged in.
 */
export function isLoggedIn() {
  return !!session
}
