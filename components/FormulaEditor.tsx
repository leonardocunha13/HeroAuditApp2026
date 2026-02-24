import Editor from "react-simple-code-editor";
import { JSX, useMemo } from "react";

interface FormulaEditorProps {
  value: string;
  onChange: (val: string) => void;
}

export function FormulaEditor({ value, onChange }: FormulaEditorProps) {
  const syntaxHighlight = useMemo(() => {
    return (code: string) => {
      const tokens: (string | JSX.Element)[] = [];
      let lastIndex = 0;
      let parenLevel = 0;

      const parenColors = ["#4caf50", "#ff5722", "#03a9f4", "#e91e63", "#ffc107"];

      const regex = /\{[^}]*\}|\(|\)|[-+*/]|\b(Math\.[a-z]+|deg)\b/g;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(code))) {
        if (match.index > lastIndex) {
          tokens.push(code.slice(lastIndex, match.index));
        }

        const token = match[0];

        if (/^\{.*\}$/.test(token)) {
          // Curly braces
          tokens.push(
            <span key={match.index} style={{ color: "#ff9800" }}>
              {token}
            </span>
          );
        } else if (token === "(") {
          const color = parenColors[parenLevel % parenColors.length];
          tokens.push(
            <span key={match.index} style={{ color }}>
              {token}
            </span>
          );
          parenLevel++;
        } else if (token === ")") {
          parenLevel = Math.max(parenLevel - 1, 0);
          const color = parenColors[parenLevel % parenColors.length];
          tokens.push(
            <span key={match.index} style={{ color }}>
              {token}
            </span>
          );
        } else if (/[-+*/]/.test(token)) {
          tokens.push(
            <span key={match.index} style={{ color: "#f44336" }}>
              {token}
            </span>
          );
        } else if (/^(Math\.[a-z]+|deg)$/.test(token)) {
          tokens.push(
            <span key={match.index} style={{ color: "#2196f3" }}>
              {token}
            </span>
          );
        } else {
          tokens.push(token);
        }

        lastIndex = match.index + token.length;
      }

      if (lastIndex < code.length) {
        tokens.push(code.slice(lastIndex));
      }

      return <>{tokens}</>;
    };
  }, []);

  return (
    <Editor
      value={value}
      onValueChange={onChange}
      highlight={syntaxHighlight}
      padding={10}
      style={{
        fontFamily: '"Fira code", monospace',
        fontSize: 14,
        minHeight: 80,
        backgroundColor: "#1e1e1e",
        color: "#fff",
        borderRadius: 4,
        overflow: "auto",
      }}
    />
  );
}