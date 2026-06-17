#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let _window = tauri::WindowBuilder::new(
                app,
                "main",
                tauri::WindowUrl::External("http://localhost:3000/".parse().unwrap()),
            )
            .title("MBG Cloud Kitchen")
            .inner_size(1200.0, 800.0)
            .build()
            .unwrap();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
