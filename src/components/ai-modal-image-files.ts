const ACCEPTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

/** Keeps file-picker and drag-and-drop uploads on the same PNG/JPEG/WebP allowlist. */
export const filterAcceptedImageFiles = (files: Iterable<File>): File[] =>
  Array.from(files).filter((file) => ACCEPTED_IMAGE_TYPES.has(file.type))
