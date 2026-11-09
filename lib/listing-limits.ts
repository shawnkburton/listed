export const MAX_LISTING_PHOTOS=25;
// Each resized photo uses up to 500 KB (about 667 KB when base64 encoded).
// Allow all 25 photos plus listing fields in one save request.
export const MAX_LISTING_REQUEST_BYTES=MAX_LISTING_PHOTOS*700000+64*1024;
