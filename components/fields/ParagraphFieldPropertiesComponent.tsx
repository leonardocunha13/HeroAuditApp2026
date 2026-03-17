"use client";

import {
    FormElementInstance,
} from "../FormElements";
import { useEffect, useState } from "react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import { Button } from "../ui/button";
import { useEditor, EditorContent } from "@tiptap/react";
import { Input } from "../ui/input";
import { CustomInstance } from "./ParagraphField";
import ListItem from '@tiptap/extension-list-item';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';

export function PropertiesComponent({ elementInstance }: { elementInstance: FormElementInstance }) {
    const element = elementInstance as CustomInstance;
    const [, setRefresh] = useState(0);


    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                bulletList: false,  // desliga bulletList do StarterKit para evitar conflito
                orderedList: false, // desliga orderedList do StarterKit para evitar conflito
                listItem: false,    // desliga listItem do StarterKit para evitar conflito
            }),
            BulletList,
            OrderedList,
            ListItem,
            TextStyle,
            Color,
            TextAlign.configure({
                types: ["paragraph"],
                alignments: ["left", "center", "right", "justify"], // 👈 add this
            }),
            Underline,
        ],
        content: element.extraAttributes.text,
        onUpdate({ editor }) {
            const html = editor.getHTML();
            element.extraAttributes.text = html;
        },
    });

    useEffect(() => {
        if (!editor) return;

        const update = () => setRefresh((v) => v + 1);

        editor.on("selectionUpdate", update);
        editor.on("transaction", update);

        return () => {
            editor.off("selectionUpdate", update);
            editor.off("transaction", update);
        };
    }, [editor]);

    useEffect(() => {
        if (editor && element.extraAttributes.text !== editor.getHTML()) {
            editor.commands.setContent(element.extraAttributes.text);
        }
    }, [editor, element.extraAttributes.text]);

    if (!element.extraAttributes) {
        return <div>Loading...</div>;
    }

    if (!editor) return null;

    return (
        <div className="space-y-4 p-4">
            <div className="flex gap-4 mb-4">
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={`px-4 py-2 ${editor.isActive("bold") ? "bg-blue-500 text-white" : "text-foreground dark:text-muted-foreground"}`}
                    >
                        <strong>B</strong>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={`px-4 py-2 ${editor.isActive("italic") ? "bg-blue-500 text-white" : "text-foreground dark:text-muted-foreground"}`}
                    >
                        <em>I</em>
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        className={`px-4 py-2 ${editor.isActive("underline") ? "bg-blue-500 text-white" : "text-foreground dark:text-muted-foreground"}`}
                    >
                        <u>U</u>
                    </Button>
                </div>

                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => editor.chain().focus().setTextAlign("left").run()}
                        className={`px-4 py-2 ${editor.isActive({ textAlign: "left" })
                            ? "bg-blue-500 text-white"
                            : "text-foreground dark:text-muted-foreground"
                            }`}
                    >
                        Left
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => editor.chain().focus().setTextAlign("center").run()}
                        className={`px-4 py-2 ${editor.isActive({ textAlign: "center" })
                            ? "bg-blue-500 text-white"
                            : "text-foreground dark:text-muted-foreground"
                            }`}
                    >
                        Center
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => editor.chain().focus().setTextAlign("right").run()}
                        className={`px-4 py-2 ${editor.isActive({ textAlign: "right" })
                            ? "bg-blue-500 text-white"
                            : "text-foreground dark:text-muted-foreground"
                            }`}
                    >
                        Right
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
                        className={`px-4 py-2 ${editor.isActive({ textAlign: "justify" })
                            ? "bg-blue-500 text-white"
                            : "text-foreground dark:text-muted-foreground"
                            }`}
                    >
                        Justify
                    </Button>
                </div>
            </div>

            <div className="flex gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <label className="font-medium">Font Color</label>
                    <Input
                        type="color"
                        onChange={(e) =>
                            editor.chain().focus().setColor(e.target.value).run()
                        }
                        className="w-12"
                    />
                </div>

            </div>

            <EditorContent editor={editor} className="border p-4 rounded-md shadow-md" />
        </div>
    );
}