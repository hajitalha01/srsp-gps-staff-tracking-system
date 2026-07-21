import cv2
import numpy as np
import os
import logging

logger = logging.getLogger(__name__)

CASCADE_PATH = os.path.join(
    os.path.dirname(__file__),
    'haarcascades',
    'haarcascade_frontalface_default.xml'
)

def _load_cascade():
    cascade = cv2.CascadeClassifier(CASCADE_PATH)
    if cascade.empty():
        logger.warning('Local cascade not found at %s, trying cv2.data.haarcascades', CASCADE_PATH)
        alt = os.path.join(cv2.data.haarcascades, 'haarcascade_frontalface_default.xml')
        logger.info('cv2.data.haarcascades = %s', cv2.data.haarcascades)
        logger.info('alt path = %s', alt)
        logger.info('alt exists: %s', os.path.exists(alt))
        cascade = cv2.CascadeClassifier(alt)
    if cascade.empty():
        raise RuntimeError(
            f'Failed to load haarcascade_frontalface_default.xml. '
            f'Tried:\n  1. {CASCADE_PATH} (exists: {os.path.exists(CASCADE_PATH)})\n'
            f'  2. {os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")}'
            f' (exists: {os.path.exists(os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml"))})'
        )
    logger.info('Cascade loaded successfully')
    return cascade

def verify_faces(profile_photo_path, selfie_bytes):
    try:
        profile_img = cv2.imread(profile_photo_path, cv2.IMREAD_GRAYSCALE)
        if profile_img is None:
            return False, 0, "Could not read profile photo"

        np_arr = np.frombuffer(selfie_bytes, np.uint8)
        selfie_img = cv2.imdecode(np_arr, cv2.IMREAD_GRAYSCALE)
        if selfie_img is None:
            return False, 0, "Could not read selfie image"

        face_cascade = _load_cascade()

        profile_faces = face_cascade.detectMultiScale(profile_img, 1.3, 5)
        selfie_faces = face_cascade.detectMultiScale(selfie_img, 1.3, 5)

        if len(profile_faces) == 0:
            return False, 0, "No face detected in profile photo"
        if len(selfie_faces) == 0:
            return False, 0, "No face detected in captured selfie"

        x, y, w, h = profile_faces[0]
        profile_face = profile_img[y:y+h, x:x+w]
        profile_face = cv2.resize(profile_face, (200, 200))

        x, y, w, h = selfie_faces[0]
        selfie_face = selfie_img[y:y+h, x:x+w]
        selfie_face = cv2.resize(selfie_face, (200, 200))

        recognizer = cv2.face.LBPHFaceRecognizer_create()
        recognizer.train([profile_face], np.array([1]))
        label, confidence = recognizer.predict(selfie_face)

        threshold = 100
        verified = confidence < threshold

        if verified:
            return True, round(confidence, 2), "Face verified successfully"
        else:
            return False, round(confidence, 2), "Face does not match"

    except Exception as e:
        logger.exception("Face verification error")
        return False, 0, f"Verification error: {str(e)}"
