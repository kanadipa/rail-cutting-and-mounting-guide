import { describe, expect, it } from "vitest";
import { de } from "./de";
import { en } from "./en";

/** Words that are the same in both languages: units, product names, symbols. */
const SAME_IN_BOTH = new Set(["locale", "mount.model", "cut.profile", "tabCount", "mm", "picker.parts"]);

/** Every text of a dictionary by path; a function is called with sample arguments. */
function texts(node: unknown, path = ""): Map<string, string> {
  const found = new Map<string, string>();
  if (typeof node === "string") return found.set(path, node);
  if (typeof node === "function") return found.set(path, String((node as (...args: unknown[]) => unknown)("-U1", "-U2", 3)));
  for (const [key, child] of Object.entries(node as Record<string, unknown>)) {
    for (const [childPath, text] of texts(child, path ? `${path}.${key}` : key)) found.set(childPath, text);
  }
  return found;
}

describe("German texts", () => {
  const english = texts(en);
  const german = texts(de);

  it("has exactly the keys of the English dictionary", () => {
    expect([...german.keys()].sort()).toEqual([...english.keys()].sort());
  });

  it("has no English text left", () => {
    const untranslated = [...english]
      .filter(([path, text]) => german.get(path) === text && !SAME_IN_BOTH.has(path))
      .map(([path]) => path);
    expect(untranslated).toEqual([]);
  });
});
