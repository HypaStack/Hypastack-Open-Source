use tauri::{Manager, menu::{Menu, MenuItem}, tray::TrayIconBuilder, WebviewWindow};
use std::path::Path;

/// Finds the first valid file path in CLI args, shows the window,
/// and injects a JS CustomEvent directly into the webview.
/// This bypasses @tauri-apps/api entirely — works even when the production
/// site doesn't bundle that package.
fn emit_upload_for_args(app: &tauri::AppHandle, args: &[String]) {
    for arg in args.iter().skip(1) {
        // Skip flags like --minimized, --upload
        if arg.starts_with('-') {
            continue;
        }

        let path = Path::new(arg);
        if path.exists() && path.is_file() {
            let size = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
            let name = path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "file".to_string());

            // Show + focus the window
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();

                // Inject JS to fire the hypadrive:upload CustomEvent directly
                // This is what the upload-zone component already listens for
                let js = format!(
                    r#"window.dispatchEvent(new CustomEvent("hypadrive:upload", {{
                        detail: {{
                            filePath: {path_json},
                            name: {name_json},
                            size: {size}
                        }}
                    }}));"#,
                    path_json = serde_json::to_string(arg).unwrap_or_default(),
                    name_json = serde_json::to_string(&name).unwrap_or_default(),
                    size = size
                );
                let _ = window.eval(&js);
            }
            break;
        }
    }
}

/// Same as emit_upload_for_args but for a WebviewWindow reference
/// (used by single-instance which gives us an AppHandle)
fn emit_upload_for_args_webview(window: &WebviewWindow, args: &[String]) {
    for arg in args.iter().skip(1) {
        if arg.starts_with('-') {
            continue;
        }

        let path = Path::new(arg);
        if path.exists() && path.is_file() {
            let size = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
            let name = path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| "file".to_string());

            let js = format!(
                r#"window.dispatchEvent(new CustomEvent("hypadrive:upload", {{
                    detail: {{
                        filePath: {path_json},
                        name: {name_json},
                        size: {size}
                    }}
                }}));"#,
                path_json = serde_json::to_string(arg).unwrap_or_default(),
                name_json = serde_json::to_string(&name).unwrap_or_default(),
                size = size
            );
            let _ = window.eval(&js);
            break;
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        // ── Single-instance guard ──
        // If a second Hypastack.exe is launched (e.g. from context menu),
        // this fires in the ALREADY-RUNNING instance with the new args.
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
                // The webview is already loaded, so inject JS immediately
                emit_upload_for_args_webview(&window, &args);
            }
        }))
        .setup(|app| {
            use tauri_plugin_autostart::ManagerExt;
            use tauri_plugin_notification::NotificationExt;

            // Automatically enable start-on-boot
            let _ = app.autolaunch().enable();

            // Only show startup notification and hide window if launched in background/minimized mode
            if std::env::args().any(|a| a == "--minimized") {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
                let _ = app.notification().builder()
                    .title("Hypastack Started")
                    .body("Hypastack is running in the background tray.")
                    .show();
            }

            // ── System tray ──
            let quit_i = MenuItem::with_id(app, "quit", "Quit Hypastack", true, None::<&str>)?;
            let show_i =
                MenuItem::with_id(app, "show", "Open Dashboard", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        std::process::exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click {
                        button: tauri::tray::MouseButton::Left,
                        button_state: tauri::tray::MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // ── Cold-start context-menu upload ──
            // When the app launches fresh from a context menu click,
            // the webview needs time to load the website before we can inject JS.
            let args: Vec<String> = std::env::args().collect();
            let has_file_arg = args.iter().skip(1).any(|a| {
                !a.starts_with('-') && Path::new(a).exists() && Path::new(a).is_file()
            });

            if has_file_arg {
                let handle = app.handle().clone();
                // Wait for the website to fully load (~4s) then inject the upload event
                std::thread::spawn(move || {
                    std::thread::sleep(std::time::Duration::from_secs(4));
                    emit_upload_for_args(&handle, &args);
                });
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Hide to tray instead of quitting
                api.prevent_close();
                let _ = window.hide();
                use tauri_plugin_notification::NotificationExt;
                let _ = window.app_handle().notification().builder()
                    .title("Hypastack Minimized")
                    .body("The app is still running in the background tray.")
                    .show();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Hypastack desktop");
}
