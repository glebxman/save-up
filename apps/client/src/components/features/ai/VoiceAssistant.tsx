import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { MicrophoneIcon, StopIcon } from "@/components/layout/icons";
import {
  Button,
  Spinner,
  ModalBackdrop,
  ModalContainer,
  ModalDialog,
  ModalHeader,
  ModalHeading,
  ModalBody,
  ModalFooter,
  Card,
  CardContent,
  cn
} from "@/components/ui";

import { useFinance } from "@/hooks/useFinance";
import { useToastStore } from "@/stores/ui.store";
import { formatMoney } from "@/utils/format";
import { AI_FREE_DAILY_LIMIT } from "@finance-twa/shared-types";

interface VoiceAssistantProps {
  onResult: (result: { type: "expense" | "income"; amount: number; category: string; note?: string }) => void;
}

export function VoiceAssistant({ onResult }: VoiceAssistantProps) {
  const { t } = useTranslation();
  const { processVoiceMutation, status } = useFinance();

  const pushToast = useToastStore((state) => state.pushToast);

  const voiceDailyUsed = status?.user?.voiceDailyUsed ?? 0;
  const isAdmin = status?.user?.isAdmin ?? false;
  const hasSubscriptionAccess = isAdmin || !!status?.user?.subscription.active;
  const creditsLeft = Math.max(0, AI_FREE_DAILY_LIMIT - voiceDailyUsed);
  const limitReached = !hasSubscriptionAccess && creditsLeft <= 0;

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [result, setResult] = useState<any>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/ogg" });
        await handleAudioProcess(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
      pushToast({ tone: "error", message: t("feedback.errors.micAccess") });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const handleAudioProcess = async (blob: Blob) => {
    try {
      const base64Audio = await blobToBase64(blob);
      const data = await processVoiceMutation.mutateAsync({ base64Audio });

      if (data) {
        setResult(data);
        setShowResultModal(true);
      } else {
        pushToast({ tone: "error", message: t("feedback.errors.aiFailed") });
      }
    } catch (err) {
      console.error("AI Assistant error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result !== "string") {
          reject(new Error("Failed to convert blob to base64"));
          return;
        }
        const base64 = result.split(",")[1];
        if (!base64) {
          reject(new Error("Failed to parse base64 from data URL"));
          return;
        }
        resolve(base64);
      };
      reader.onerror = () => reject(reader.error || new Error("FileReader error"));
      reader.readAsDataURL(blob);
    });
  };


  const handleConfirm = () => {
    onResult(result);
    setShowResultModal(false);
    setResult(null);
  };

  return (
    <>
      <div className="flex items-center">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing || (!isRecording && limitReached)}
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${isRecording
              ? "bg-[var(--danger)] animate-pulse text-white"
              : limitReached
              ? "bg-[var(--surface-tertiary)] text-[var(--muted)] cursor-not-allowed opacity-50"
              : "bg-[var(--surface-tertiary)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
            }`}
          title={isRecording ? t("ai.stopRecording") : limitReached ? t("ai.creditsExhausted") : t("ai.startRecording")}
        >
          {isProcessing ? (
            <Spinner size="sm" />
          ) : isRecording ? (
            <StopIcon className="h-5 w-5" />
          ) : (
            <MicrophoneIcon className="h-5 w-5" />
          )}
        </button>
        {isRecording && (
          <span className="ml-2 text-xs font-medium text-[var(--danger)] animate-pulse">
            {t("ai.recording")}...
          </span>
        )}
        {limitReached && !isRecording && (
          <span className="ml-2 text-xs font-medium text-[var(--muted)]">
            {t("ai.creditsExhausted")}
          </span>
        )}
        {!hasSubscriptionAccess && !limitReached && !isRecording && (
          <span className="ml-2 text-xs font-medium text-[var(--muted)]">
            {t("ai.creditsRemaining", { count: creditsLeft })}
          </span>
        )}
      </div>

      <ModalBackdrop isOpen={showResultModal} onOpenChange={setShowResultModal}>
        <ModalContainer size="sm">
          <ModalDialog>
            <ModalHeader>
              <ModalHeading>{t("ai.resultTitle")}</ModalHeading>
            </ModalHeader>
            <ModalBody>

              {result && (
                <Card variant="secondary" className="border-none shadow-none bg-[var(--surface-secondary)]">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-4">
                      <span className={cn(
                        "py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                        result.type === "income" ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--danger-soft)] text-[var(--danger)]"
                      )}>
                        {t(`transactionType.${result.type}`)}
                      </span>
                      <span className="text-lg font-bold text-[var(--foreground)]">
                        {formatMoney(result.amount)}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--muted)]">{t("recurring.category")}:</span>
                        <span className="font-medium text-[var(--foreground)]">{t(`expenseCategory.${result.category}`)}</span>
                      </div>
                      {result.note && (
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--muted)]">{t("recurring.note")}:</span>
                          <span className="font-medium text-[var(--foreground)] italic">{result.note}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </ModalBody>
            <ModalFooter className="flex gap-2">
              <Button variant="secondary" fullWidth onPress={() => setShowResultModal(false)}>
                {t("common.cancel")}
              </Button>
              <Button variant="primary" fullWidth onPress={handleConfirm}>
                {t("common.confirm")}
              </Button>
            </ModalFooter>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>

    </>
  );
}
