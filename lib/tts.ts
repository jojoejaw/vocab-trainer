// อ่านออกเสียงด้วย Web Speech API ในเบราว์เซอร์ (ฟรี ไม่ต้องใช้เน็ตถ้าเครื่องมีเสียงภาษาอังกฤษ)
export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.9;
  const voice = synth.getVoices().find((v) => v.lang === "en-US") ?? synth.getVoices().find((v) => v.lang.startsWith("en"));
  if (voice) u.voice = voice;
  synth.speak(u);
  return true;
}
