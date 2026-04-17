import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function askGemini(question: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: question,
      config: {
        systemInstruction: "Ты — профессиональный ассистент рентгенологического кабинета. Отвечай кратко, вежливо и профессионально. Если вопрос не касается медицины или рентгена, вежливо откажись отвечать.",
      },
    });
    return response.text || "Извините, я не смог подготовить ответ.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Произошла ошибка при обращении к ИИ.";
  }
}
