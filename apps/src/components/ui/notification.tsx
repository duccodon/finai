import * as React from "react";
import {
    Card,
    CardContent,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";

export type NotifyVariant = "success" | "error";

export type Notification = {
    id: string;
    title: string;
    description?: string;
    variant?: NotifyVariant;
};

export function NotificationList({
    items,
    onClose,
}: {
    items: Notification[];
    onClose: (id: string) => void;
}) {
    if (!items.length) return null;

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-80">
            {items.map((it) => {
                const isError = it.variant === "error";
                const border = isError
                    ? "border-red-200 bg-red-50 text-red-900"
                    : "border-green-200 bg-green-50 text-green-900";
                return (
                    <Card
                        key={it.id}
                        className={`p-3 border ${border} shadow`}
                        role="status"
                        aria-live="polite">
                        <CardContent className="p-0">
                            <div className="flex justify-between items-start gap-2">
                                <div>
                                    <CardTitle className="text-sm">
                                        {it.title}
                                    </CardTitle>
                                    {it.description ? (
                                        <CardDescription className="text-xs mt-1">
                                            {it.description}
                                        </CardDescription>
                                    ) : null}
                                </div>
                                <button
                                    onClick={() => onClose(it.id)}
                                    aria-label="close"
                                    className="text-sm opacity-60 hover:opacity-100 ml-2">
                                    ✕
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
