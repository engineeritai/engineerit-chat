package ai.engineerit.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.provider.MediaStore;
import android.webkit.MimeTypeMap;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import java.io.File;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Presents camera, photos, and documents for the website's file inputs.
 * Capacitor's default chooser only offers the camera when the input has a capture attribute.
 * engineerit.ai uses accept="image/*" and an office/PDF accept list without capture.
 */
public class EngineeritFileChooser {

    private static final Map<String, String> EXTRA_MIME_TYPES = new LinkedHashMap<>();

    static {
        EXTRA_MIME_TYPES.put("pdf", "application/pdf");
        EXTRA_MIME_TYPES.put("doc", "application/msword");
        EXTRA_MIME_TYPES.put("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        EXTRA_MIME_TYPES.put("xls", "application/vnd.ms-excel");
        EXTRA_MIME_TYPES.put("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        EXTRA_MIME_TYPES.put("ppt", "application/vnd.ms-powerpoint");
        EXTRA_MIME_TYPES.put("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
        EXTRA_MIME_TYPES.put("txt", "text/plain");
        EXTRA_MIME_TYPES.put("csv", "text/csv");
        EXTRA_MIME_TYPES.put("png", "image/png");
        EXTRA_MIME_TYPES.put("jpg", "image/jpeg");
        EXTRA_MIME_TYPES.put("jpeg", "image/jpeg");
        EXTRA_MIME_TYPES.put("gif", "image/gif");
        EXTRA_MIME_TYPES.put("webp", "image/webp");
        EXTRA_MIME_TYPES.put("heic", "image/heic");
    }

    private final MainActivity activity;
    private final ActivityResultLauncher<String> cameraPermissionLauncher;
    private final ActivityResultLauncher<Intent> activityLauncher;
    private ValueCallback<Uri[]> pendingCallback;
    private Uri pendingCameraUri;
    private boolean includeCamera;

    public EngineeritFileChooser(MainActivity activity) {
        this.activity = activity;
        this.cameraPermissionLauncher =
            activity.registerForActivityResult(new ActivityResultContracts.RequestPermission(), granted -> {
                showChooser(includeCamera && Boolean.TRUE.equals(granted));
            });
        this.activityLauncher =
            activity.registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), result -> {
                deliver(result.getResultCode(), result.getData());
            });
    }

    public void show(ValueCallback<Uri[]> callback, WebChromeClient.FileChooserParams params) {
        cancelPending();
        pendingCallback = callback;
        includeCamera = wantsCamera(params);
        if (includeCamera && !hasCameraPermission()) {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA);
            return;
        }
        showChooser(includeCamera);
    }

    private void showChooser(boolean withCamera) {
        Intent content = new Intent(Intent.ACTION_GET_CONTENT);
        content.addCategory(Intent.CATEGORY_OPENABLE);
        content.setType("*/*");
        String[] mimeTypes = mimeTypesForPendingAccept();
        if (mimeTypes.length > 0) {
            content.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes);
            if (mimeTypes.length == 1) content.setType(mimeTypes[0]);
        }

        Intent chooser = Intent.createChooser(content, "Attach a file");
        if (withCamera) {
            Intent camera = cameraIntent();
            if (camera != null) {
                chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[] { camera });
            }
        }

        try {
            activityLauncher.launch(chooser);
        } catch (ActivityNotFoundException ex) {
            finish(null);
        }
    }

    private Intent cameraIntent() {
        Intent capture = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        if (capture.resolveActivity(activity.getPackageManager()) == null) return null;
        try {
            pendingCameraUri = createImageUri();
        } catch (Exception ex) {
            return null;
        }
        capture.putExtra(MediaStore.EXTRA_OUTPUT, pendingCameraUri);
        capture.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        return capture;
    }

    private Uri createImageUri() throws java.io.IOException {
        File dir = new File(activity.getCacheDir(), "camera");
        if (!dir.exists() && !dir.mkdirs()) {
            throw new java.io.IOException("Unable to create camera cache");
        }
        File photo = new File(dir, "capture-" + System.currentTimeMillis() + ".jpg");
        if (!photo.exists() && !photo.createNewFile()) {
            throw new java.io.IOException("Unable to create camera file");
        }
        return FileProvider.getUriForFile(activity, activity.getPackageName() + ".fileprovider", photo);
    }

    private void deliver(int resultCode, Intent data) {
        if (pendingCallback == null) return;
        if (resultCode != Activity.RESULT_OK) {
            finish(null);
            return;
        }
        if (data != null && data.getClipData() != null) {
            int count = data.getClipData().getItemCount();
            Uri[] uris = new Uri[count];
            for (int i = 0; i < count; i++) {
                uris[i] = data.getClipData().getItemAt(i).getUri();
            }
            finish(uris);
            return;
        }
        if (data != null && data.getData() != null) {
            finish(new Uri[] { data.getData() });
            return;
        }
        if (pendingCameraUri != null) {
            finish(new Uri[] { pendingCameraUri });
            return;
        }
        finish(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
    }

    private void finish(Uri[] value) {
        ValueCallback<Uri[]> callback = pendingCallback;
        pendingCallback = null;
        pendingCameraUri = null;
        if (callback != null) callback.onReceiveValue(value);
    }

    private void cancelPending() {
        if (pendingCallback != null) {
            pendingCallback.onReceiveValue(null);
            pendingCallback = null;
        }
        pendingCameraUri = null;
    }

    private boolean hasCameraPermission() {
        return (
            ContextCompat.checkSelfPermission(activity, Manifest.permission.CAMERA) ==
            android.content.pm.PackageManager.PERMISSION_GRANTED
        );
    }

    private boolean wantsCamera(WebChromeClient.FileChooserParams params) {
        if (params == null) return false;
        if (params.isCaptureEnabled()) return true;
        String[] types = params.getAcceptTypes();
        if (types == null || types.length == 0) return true;
        boolean any = false;
        for (String type : types) {
            if (type == null || type.trim().isEmpty()) continue;
            any = true;
            String value = type.trim().toLowerCase();
            if (value.equals("*/*") || value.startsWith("image/") || value.contains("image")) return true;
        }
        return !any;
    }

    private String[] acceptTypes = new String[0];

    public void rememberAcceptTypes(WebChromeClient.FileChooserParams params) {
        acceptTypes = params == null || params.getAcceptTypes() == null ? new String[0] : params.getAcceptTypes();
    }

    private String[] mimeTypesForPendingAccept() {
        List<String> mimes = new ArrayList<>();
        MimeTypeMap map = MimeTypeMap.getSingleton();
        for (String raw : acceptTypes) {
            if (raw == null) continue;
            for (String piece : raw.split(",")) {
            String type = piece.trim().toLowerCase();
            if (type.isEmpty()) continue;
            if (type.startsWith(".")) type = type.substring(1);
            if (type.contains("/")) {
                if (!mimes.contains(type)) mimes.add(type);
                continue;
            }
            String known = EXTRA_MIME_TYPES.get(type);
            if (known == null) known = map.getMimeTypeFromExtension(type);
            if (known != null && !mimes.contains(known)) mimes.add(known);
            }
        }
        if (mimes.isEmpty()) mimes.add("*/*");
        return mimes.toArray(new String[0]);
    }
}
