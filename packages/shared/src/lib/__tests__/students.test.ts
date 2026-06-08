// packages/shared/src/lib/__tests__/students.test.ts
//
// Tests for student display helpers. All in-memory; no DB.

import { describe, it, expect } from "vitest";
import {
  initials,
  displayStudentName,
  sortStudentsByLastName,
  type StudentNameLike,
} from "../students";

const makeStudent = (
  overrides: Partial<StudentNameLike> = {},
): StudentNameLike => ({
  first_name: "Ana",
  last_name: "Popescu",
  ...overrides,
});

describe("initials", () => {
  it("returns uppercase first letters of first and last name", () => {
    expect(initials("Ana", "Popescu")).toBe("AP");
  });

  it("uppercases lowercase input", () => {
    expect(initials("ana", "popescu")).toBe("AP");
  });

  it("handles single-character names", () => {
    expect(initials("A", "P")).toBe("AP");
  });

  it("handles empty first name", () => {
    expect(initials("", "Popescu")).toBe("P");
  });

  it("handles empty last name", () => {
    expect(initials("Ana", "")).toBe("A");
  });

  it("handles both empty", () => {
    expect(initials("", "")).toBe("");
  });

  it("preserves diacritics", () => {
    expect(initials("Štefan", "Černý")).toBe("ŠČ");
  });
});

describe("displayStudentName", () => {
  it("formats as 'First Last'", () => {
    expect(displayStudentName(makeStudent())).toBe("Ana Popescu");
  });

  it("preserves diacritics", () => {
    expect(
      displayStudentName(
        makeStudent({ first_name: "Štefan", last_name: "Černý" }),
      ),
    ).toBe("Štefan Černý");
  });

  it("accepts students with extra fields (structural typing)", () => {
    const studentWithMore = {
      first_name: "Maria",
      last_name: "Ionescu",
      email: "maria@example.com",
      id: "abc",
    };
    expect(displayStudentName(studentWithMore)).toBe("Maria Ionescu");
  });
});

describe("sortStudentsByLastName", () => {
  it("returns empty when input is empty", () => {
    expect(sortStudentsByLastName([])).toEqual([]);
  });

  it("sorts by last name ascending", () => {
    const students = [
      makeStudent({ first_name: "Ana", last_name: "Popescu" }),
      makeStudent({ first_name: "Maria", last_name: "Ionescu" }),
      makeStudent({ first_name: "Andrei", last_name: "Andreescu" }),
    ];
    const sorted = sortStudentsByLastName(students);
    expect(sorted.map((s) => s.last_name)).toEqual([
      "Andreescu",
      "Ionescu",
      "Popescu",
    ]);
  });

  it("breaks ties by first name", () => {
    const students = [
      makeStudent({ first_name: "Maria", last_name: "Popescu" }),
      makeStudent({ first_name: "Ana", last_name: "Popescu" }),
    ];
    const sorted = sortStudentsByLastName(students);
    expect(sorted.map((s) => s.first_name)).toEqual(["Ana", "Maria"]);
  });

  it("is locale-aware with diacritics (RO/CZ)", () => {
    const students = [
      makeStudent({ first_name: "A", last_name: "Štefan" }),
      makeStudent({ first_name: "A", last_name: "Ana" }),
      makeStudent({ first_name: "A", last_name: "Beáta" }),
    ];
    const sorted = sortStudentsByLastName(students);
    expect(sorted.map((s) => s.last_name)).toEqual(["Ana", "Beáta", "Štefan"]);
  });

  it("does not mutate input", () => {
    const students = [
      makeStudent({ last_name: "B" }),
      makeStudent({ last_name: "A" }),
    ];
    const original = students.map((s) => s.last_name);
    sortStudentsByLastName(students);
    expect(students.map((s) => s.last_name)).toEqual(original);
  });
});
