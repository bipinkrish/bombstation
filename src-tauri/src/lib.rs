use std::net::TcpStream;
use std::process::{Child, Command};
use std::sync::Mutex;
use std::time::Duration;
use tauri::Manager;

#[derive(Default)]
struct BackendProcess(Mutex<Option<Child>>);

fn is_server_listening(port: u16) -> bool {
    TcpStream::connect_timeout(
        &format!("127.0.0.1:{}", port).parse().unwrap(),
        Duration::from_millis(200),
    )
    .is_ok()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(BackendProcess::default())
        .setup(|app| {
            if !is_server_listening(8080) {
                let py_cmd = if cfg!(windows) { "python" } else { "python3" };

                let current_exe = std::env::current_exe().unwrap_or_default();
                let parent = current_exe
                    .parent()
                    .and_then(|p| p.parent())
                    .and_then(|p| p.parent())
                    .unwrap_or(&current_exe);

                let mut spawn_cmd = Command::new(py_cmd);
                spawn_cmd.args(["bombstation_studio.py", "--no-open", "--port", "8080"]);

                if std::path::Path::new("bombstation_studio.py").exists() {
                    spawn_cmd.current_dir(".");
                } else if parent.join("bombstation_studio.py").exists() {
                    spawn_cmd.current_dir(parent);
                }

                if let Ok(child) = spawn_cmd.spawn() {
                    if let Some(state) = app.try_state::<BackendProcess>() {
                        if let Ok(mut guard) = state.0.lock() {
                            *guard = Some(child);
                        }
                    }
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(state) = window.try_state::<BackendProcess>() {
                    if let Ok(mut guard) = state.0.lock() {
                        if let Some(mut child) = guard.take() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
