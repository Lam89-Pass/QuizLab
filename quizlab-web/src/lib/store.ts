"use client";
import { useCallback, useEffect, useState } from "react";

export type QType = "mc" | "tf";
export type Question = {
    id: string;
    text: string;
    type: QType;
    options: string[];
    correct: number;
    duration: number;
    imageUrl?: string;
    explanation?: string;
};
export type Quiz = {
    id: string;
    title: string;
    description: string;
    questions: Question[];
    updatedAt: number;
};
export type QuizSummary = {
    id: string;
    title: string;
    description: string;
    updatedAt: number;
    questionCount: number;
};
export type User = {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
    provider: string;
};

export const uid = () => Math.random().toString(36).slice(2, 9);

export function newQuestion(type: QType): Question {
    return {
        id: uid(),
        text: "",
        type,
        options: type === "tf" ? ["Benar", "Salah"] : ["", "", "", ""],
        correct: 0,
        duration: 10,
        imageUrl: "",
        explanation: "",
    };
}

export async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
        let msg = "Terjadi kesalahan, coba lagi";
        try {
            msg = (await res.json()).error ?? msg;
        } catch { }
        throw new Error(msg);
    }
    return res.status === 204 ? (undefined as T) : res.json();
}

export function useQuizzes() {
    const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
    const [ready, setReady] = useState(false);
    const [error, setError] = useState("");

    const reload = useCallback(async () => {
        try {
            setQuizzes(await api<QuizSummary[]>("/api/quizzes"));
            setError("");
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setReady(true);
        }
    }, []);

    useEffect(() => {
        reload();
    }, [reload]);

    const remove = useCallback(
        async (id: string) => {
            await api(`/api/quizzes/${id}`, { method: "DELETE" });
            await reload();
        },
        [reload]
    );

    return { quizzes, ready, error, reload, remove };
}

export function useUser() {
    const [user, setUser] = useState<User | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        fetch("/api/me")
            .then((r) => (r.ok ? r.json() : null))
            .then((u) => setUser(u))
            .catch(() => setUser(null))
            .finally(() => setReady(true));
    }, []);

    const logout = async () => {
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => { });
        setUser(null);
    };

    return { user, ready, logout };
}