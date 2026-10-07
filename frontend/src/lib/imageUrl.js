//src/lib/imageUrl.js

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const imageSrc = (image) => {
  if (!image) return '';
  return /^https?:\/\//i.test(image) ? image : `${API_URL}${image}`;
};