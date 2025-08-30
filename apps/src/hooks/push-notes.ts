import { useState } from "react";
import type { Notification } from "@/components/ui/notification";

export function useNotifications() {
    const [notes, setNotes] = useState<Notification[]>([]);

    const pushNote = (n: Omit<Notification, "id">) => {
        const id = String(Date.now()) + Math.random().toString(36).slice(2, 8);
        const item: Notification = { id, ...n };
        setNotes((s) => [item, ...s]);
        // auto remove after 5s
        setTimeout(() => setNotes((s) => s.filter((x) => x.id !== id)), 5000);
    };

    const removeNote = (id: string) =>
        setNotes((s) => s.filter((x) => x.id !== id));

    return { notes, pushNote, removeNote };
}
