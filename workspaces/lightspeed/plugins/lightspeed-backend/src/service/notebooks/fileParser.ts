/*
 * Copyright Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as yaml from 'js-yaml';
import * as pdfjsLib from 'pdfjs-dist';

/**
 * Supported file types for document upload
 */
export enum SupportedFileType {
  MARKDOWN = 'md',
  TEXT = 'txt',
  PDF = 'pdf',
  JSON = 'json',
  YAML = 'yaml',
  YML = 'yml',
  LOG = 'log',
}

export interface ParsedDocument {
  content: string;
  metadata: {
    fileName: string;
    fileType: string;
    pageCount?: number;
    parseTimestamp: string;
  };
}

/**
 * Parse text-based files (md, txt, log)
 */
function parseTextFile(
  buffer: Buffer,
  fileName: string,
  fileType: string,
): ParsedDocument {
  const content = buffer.toString('utf-8');

  return {
    content,
    metadata: {
      fileName,
      fileType,
      parseTimestamp: new Date().toISOString(),
    },
  };
}

/**
 * Parse JSON files
 */
function parseJSONFile(
  buffer: Buffer,
  fileName: string,
  fileType: string,
): ParsedDocument {
  try {
    const text = buffer.toString('utf-8');
    const parsed = JSON.parse(text);
    // Return formatted JSON for better readability
    const content = JSON.stringify(parsed, null, 2);

    return {
      content,
      metadata: {
        fileName,
        fileType,
        parseTimestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(`Invalid JSON file: ${error}`);
  }
}

/**
 * Parse YAML files
 */
function parseYAMLFile(
  buffer: Buffer,
  fileName: string,
  fileType: string,
): ParsedDocument {
  try {
    const text = buffer.toString('utf-8');
    // Parse YAML to validate it
    const parsed = yaml.load(text);
    // Convert back to YAML string for storage (or could store as JSON)
    const content = yaml.dump(parsed, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });

    return {
      content,
      metadata: {
        fileName,
        fileType,
        parseTimestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(`Invalid YAML file: ${error}`);
  }
}

/**
 * Parse PDF files (native PDF only)
 * Extracts text content from PDF using PDF.js
 */
async function parsePDFFile(
  buffer: Buffer,
  fileName: string,
  fileType: string,
): Promise<ParsedDocument> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const textParts: string[] = [];

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item: any) => {
          if ('str' in item) {
            return item.str;
          }
          return '';
        })
        .filter((str: string) => str.trim().length > 0)
        .join(' ');

      if (pageText.trim().length > 0) {
        textParts.push(`--- Page ${pageNum} ---\n${pageText}`);
      }
    }

    const content = textParts.join('\n\n');

    return {
      content,
      metadata: {
        fileName,
        fileType,
        pageCount: pdf.numPages,
        parseTimestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    throw new Error(`Error parsing PDF: ${error}`);
  }
}

/**
 * Validate file type
 */
export function isValidFileType(fileType: string): boolean {
  const normalizedType = fileType.toLocaleLowerCase('en-US').replace(/^\./, '');
  return Object.values(SupportedFileType).includes(
    normalizedType as SupportedFileType,
  );
}

/**
 * Validate file size (max 20MB by default)
 */
export function isValidFileSize(
  fileSize: number,
  maxSizeMB: number = 20,
): boolean {
  const maxSize = maxSizeMB * 1024 * 1024;
  return fileSize <= maxSize;
}

/**
 * Parse file based on its type
 */
export async function parseFile(
  buffer: Buffer,
  fileName: string,
  fileType: string,
): Promise<ParsedDocument> {
  const normalizedType = fileType
    .toLocaleLowerCase('en-US')
    .replace(/^\./, '') as SupportedFileType;

  if (!isValidFileType(normalizedType)) {
    throw new Error(`Unsupported file type: ${fileType}`);
  }

  switch (normalizedType) {
    case SupportedFileType.MARKDOWN:
    case SupportedFileType.TEXT:
    case SupportedFileType.LOG:
      return parseTextFile(buffer, fileName, fileType);

    case SupportedFileType.JSON:
      return parseJSONFile(buffer, fileName, fileType);

    case SupportedFileType.YAML:
    case SupportedFileType.YML:
      return parseYAMLFile(buffer, fileName, fileType);

    case SupportedFileType.PDF:
      return parsePDFFile(buffer, fileName, fileType);

    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}
