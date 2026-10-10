// app/api/warmup/route.js

/**
 * Pings the backend so a sleeping Hugging Face Space starts booting.
 *
 * Called on page load (so the Space wakes while the visitor reads) and by a
 * daily Vercel cron (free Spaces sleep after 48h idle, so this keeps it awake).
 */
export async function GET() {
  const backendUrl = process.env.BACKEND_URL || 'https://ffalathel-deepfake-detector.hf.space';
  try {
    const res = await fetch(`${backendUrl}/health`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    return Response.json({ backend: res.ok ? 'awake' : 'waking' });
  } catch {
    // Timeout while booting is expected; the request still triggered the wake-up
    return Response.json({ backend: 'waking' });
  }
}
