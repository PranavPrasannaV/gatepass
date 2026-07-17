import { describe, it, expect } from "vitest";
import { buildXlsx, readXlsxRows, parseXlsxQuestionnaire, zip, unzip } from "../src/index.js";

// ---------- ZIP roundtrip ----------

describe("zip / unzip", () => {
  it("zip and unzip are roundtrip-safe", () => {
    const data = Buffer.from("hello world");
    const zipped = zip([{ name: "hello.txt", data }]);
    const extracted = unzip(zipped);
    expect(extracted.get("hello.txt")!.toString()).toBe("hello world");
  });

  it("zip handles multiple entries", () => {
    const zipped = zip([
      { name: "a.txt", data: Buffer.from("aaa") },
      { name: "b.txt", data: Buffer.from("bbb") },
      { name: "sub/c.txt", data: Buffer.from("ccc") },
    ]);
    const extracted = unzip(zipped);
    expect(extracted.size).toBe(3);
    expect(extracted.get("a.txt")!.toString()).toBe("aaa");
    expect(extracted.get("b.txt")!.toString()).toBe("bbb");
    expect(extracted.get("sub/c.txt")!.toString()).toBe("ccc");
  });

  it("unzip throws on invalid data", () => {
    expect(() => unzip(Buffer.from("not a zip"))).toThrow("not a zip file");
  });
});

// ---------- buildXlsx / readXlsxRows roundtrip ----------

describe("buildXlsx / readXlsxRows", () => {
  it("buildXlsx produces a valid .xlsx that readXlsxRows can read back", () => {
    const rows = [
      ["Name", "Age", "City"],
      ["Alice", "30", "New York"],
      ["Bob", "25", "London"],
    ];
    const xlsx = buildXlsx(rows);
    const result = readXlsxRows(xlsx);
    expect(result).toEqual(rows);
  });

  it("readXlsxRows extracts rows and columns correctly", () => {
    const rows = [
      ["A", "B", "C"],
      ["1", "2", "3"],
      ["x", "y", "z"],
    ];
    const xlsx = buildXlsx(rows);
    expect(readXlsxRows(xlsx)).toEqual(rows);
  });

  it("buildXlsx handles empty cells (empty strings)", () => {
    const rows = [
      ["a", "", "c"],
      ["", "b", ""],
    ];
    const xlsx = buildXlsx(rows);
    expect(readXlsxRows(xlsx)).toEqual(rows);
  });

  it("buildXlsx handles special XML characters", () => {
    const rows = [["a < b", "x > y", "foo & bar", 'quote "here"', "it's"]];
    const xlsx = buildXlsx(rows);
    const result = readXlsxRows(xlsx);
    expect(result[0]![0]).toBe("a < b");
    expect(result[0]![1]).toBe("x > y");
    expect(result[0]![2]).toBe("foo & bar");
    expect(result[0]![3]).toBe('quote "here"');
    expect(result[0]![4]).toBe("it's");
  });
});

// ---------- parseXlsxQuestionnaire ----------

describe("parseXlsxQuestionnaire", () => {
  it("extracts items from a well-formed questionnaire xlsx", () => {
    const rows = [
      ["id", "question"],
      ["q1", "How do you handle secrets?"],
      ["q2", "What about CORS?"],
    ];
    const xlsx = buildXlsx(rows);
    const items = parseXlsxQuestionnaire(xlsx);
    expect(items).toEqual([
      { id: "q1", question: "How do you handle secrets?" },
      { id: "q2", question: "What about CORS?" },
    ]);
  });

  it("returns empty array for single-row (header-only) xlsx", () => {
    const xlsx = buildXlsx([["id", "question"]]);
    expect(parseXlsxQuestionnaire(xlsx)).toEqual([]);
  });

  it("handles empty question cells by filtering them out", () => {
    const xlsx = buildXlsx([
      ["id", "question"],
      ["q1", "valid question"],
      ["q2", ""],
    ]);
    const items = parseXlsxQuestionnaire(xlsx);
    expect(items).toEqual([{ id: "q1", question: "valid question" }]);
  });
});

// ---------- Shared strings ----------

describe('shared strings (t="s")', () => {
  it("readXlsxRows handles shared strings type", () => {
    const contentTypes = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;
    const rootRels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const workbook = `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`;
    const wbRels = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;
    const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="3" uniqueCount="3">
  <si><t>Hello</t></si>
  <si><t>World</t></si>
  <si><t>Foo &amp; Bar</t></si>
</sst>`;
    const sheetXml = `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="s"><v>0</v></c>
      <c r="B1" t="s"><v>1</v></c>
    </row>
    <row r="2">
      <c r="A2" t="s"><v>2</v></c>
    </row>
  </sheetData>
</worksheet>`;

    const xlsx = zip([
      { name: "[Content_Types].xml", data: Buffer.from(contentTypes) },
      { name: "_rels/.rels", data: Buffer.from(rootRels) },
      { name: "xl/workbook.xml", data: Buffer.from(workbook) },
      { name: "xl/_rels/workbook.xml.rels", data: Buffer.from(wbRels) },
      { name: "xl/worksheets/sheet1.xml", data: Buffer.from(sheetXml) },
      { name: "xl/sharedStrings.xml", data: Buffer.from(sharedStringsXml) },
    ]);
    const rows = readXlsxRows(xlsx);
    expect(rows).toEqual([["Hello", "World"], ["Foo & Bar"]]);
  });
});
