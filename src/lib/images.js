/**
 * Image helpers: resize + upload to Firebase Storage or fall back to base64.
 */
import { uploadImageToFirebase, isFirebaseReady } from './firebase.js';

const MAX_SIZE = 1200;

export function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = () => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                let { width, height } = img;
                if (width > height ? width > MAX_SIZE : height > MAX_SIZE) {
                    if (width > height) {
                        height = Math.round((height * MAX_SIZE) / width);
                        width  = MAX_SIZE;
                    } else {
                        width  = Math.round((width * MAX_SIZE) / height);
                        height = MAX_SIZE;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width  = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.75));
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

export async function resolveImageSrc(file) {
    if (isFirebaseReady()) {
        const url = await uploadImageToFirebase(file);
        if (url) return url;
    }
    return readFileAsDataURL(file);
}

export function placeholderImg(w, h) {
    return `https://placehold.co/${w}x${h}/d4d2cc/5a5a5a?text=Cliquer+pour+changer`;
}
