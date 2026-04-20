"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import Image from "next/image";
import { uploadData, getUrl } from "aws-amplify/storage";

type SignatureCellProps = {
    row: number;
    col: number;
    value: string;
    handleCellChange: (row: number, col: number, value: string) => void;
    readOnly: boolean;
};

export function SignatureCell({
    row,
    col,
    value,
    handleCellChange,
    readOnly,
}: SignatureCellProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [open, setOpen] = useState(false);
    const [drawing, setDrawing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const signatureKeyMatch = value.match(/^\[signature:(.*?)\]$/);
    const signatureKey = signatureKeyMatch?.[1] ?? "";
    const hasSavedSignature = !!signatureKey;

    useEffect(() => {
        let active = true;

        async function loadSignature() {
            if (!signatureKey) {
                setSignedUrl(null);
                return;
            }

            try {
                // already a usable URL
                if (
                    signatureKey.startsWith("http://") ||
                    signatureKey.startsWith("https://") ||
                    signatureKey.startsWith("data:image/")
                ) {
                    if (active) setSignedUrl(signatureKey);
                    return;
                }

                // otherwise treat as S3 key
                const { url } = await getUrl({ path: signatureKey });
                if (active) setSignedUrl(url.toString());
            } catch (err) {
                console.error("Failed to load signature from S3", err);
                if (active) setSignedUrl(null);
            }
        }

        loadSignature();

        return () => {
            active = false;
        };
    }, [signatureKey]);

    useEffect(() => {
        if (!open) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
    }, [open]);

    const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * canvas.width,
            y: ((e.clientY - rect.top) / rect.height) * canvas.height,
        };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const { x, y } = getPoint(e);
        ctx.beginPath();
        ctx.moveTo(x, y);
        setDrawing(true);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!drawing) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const { x, y } = getPoint(e);
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const handlePointerUp = () => {
        setDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const saveSignature = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        try {
            setLoading(true);

            const blob = await new Promise<Blob | null>((resolve) =>
                canvas.toBlob((b) => resolve(b), "image/png")
            );

            if (!blob) return;

            const key = `public/signatures/${Date.now()}-r${row}-c${col}.png`;

            await uploadData({
                path: key,
                data: blob,
                options: {
                    contentType: "image/png",
                },
            }).result;

            const { url } = await getUrl({ path: key });

            handleCellChange(row, col, `[signature:${url.toString()}]`);
            setOpen(false);
        } catch (err) {
            console.error("Failed to upload signature", err);
        } finally {
            setLoading(false);
        }
    };

    if (readOnly) {
        if (hasSavedSignature && signedUrl) {
            return (
                <Image
                    src={signedUrl}
                    alt="Signature"
                    unoptimized
                    width={180}
                    height={70}
                    className="object-contain border rounded bg-white"
                />
            );
        }

        return <div className="text-muted-foreground italic">No signature</div>;
    }

    return (
        <>
            {hasSavedSignature && signedUrl ? (
                <div className="flex flex-col gap-2">
                    <Image
                        src={signedUrl}
                        alt="Signature"
                        unoptimized
                        width={180}
                        height={70}
                        className="object-contain border rounded bg-white"
                    />
                    <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
                        Re-sign
                    </Button>
                </div>
            ) : (
                <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
                    Sign
                </Button>
            )}

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-lg shadow-lg p-4 w-[520px] max-w-[95vw] space-y-3">
                        <div className="font-medium">Signature</div>

                        <canvas
                            ref={canvasRef}
                            width={480}
                            height={180}
                            className="border rounded bg-white touch-none w-full"
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerUp}
                        />

                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={clearCanvas}>
                                Clear
                            </Button>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="button" onClick={saveSignature} disabled={loading}>
                                {loading ? "Saving..." : "Save"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}