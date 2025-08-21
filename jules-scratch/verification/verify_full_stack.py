import os
from playwright.sync_api import sync_playwright, expect

# Define a dummy image file for upload testing
DUMMY_IMAGE_NAME = "test_image.png"
DUMMY_IMAGE_CONTENT = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'

def create_dummy_image():
    """Creates a dummy image file for the test."""
    with open(DUMMY_IMAGE_NAME, 'wb') as f:
        f.write(DUMMY_IMAGE_CONTENT)

def run_verification():
    """Runs the full-stack verification test."""
    create_dummy_image()

    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(locale="es-ES")
        page = context.new_page()

        base_url = "http://127.0.0.1:5000"
        page.goto(base_url)

        # --- 1. Create User ---
        # Use page.expect_response to wait for the network call to complete
        with page.expect_response(f"{base_url}/api/users") as response_info:
            page.get_by_placeholder("Ingresa nuevo usuario").fill("TestUser")
            page.get_by_role("button", name="Crear Usuario").click()

        response = response_info.value
        expect(response.ok).to_be_true()

        # Now that the user is created, select them from the dropdown.
        page.locator('select#user-dropdown').select_option(label='TestUser')
        expect(page.locator('select#user-dropdown')).to_have_value("1")

        # --- 2. Create Muscle Group ---
        page.get_by_placeholder("Nombre del Grupo Muscular").fill("E2E Test Group")
        page.get_by_role("button", name="Agregar Grupo").click()
        expect(page.get_by_text("E2E Test Group")).to_be_visible()
        page.get_by_text("E2E Test Group").click()

        # --- 3. Create Exercise with Image ---
        expect(page.get_by_role("heading", name="E2E Test Group")).to_be_visible()
        page.get_by_placeholder("Nombre del Ejercicio").fill("Push-up")
        page.get_by_placeholder("Peso (kg)").fill("0")
        page.get_by_placeholder("Series").fill("3")
        page.get_by_placeholder("Repeticiones").fill("15")
        page.locator("#exercise-image-input").set_input_files(DUMMY_IMAGE_NAME)
        page.get_by_role("button", name="Agregar Ejercicio").click()

        # --- 4. Verify Exercise and Image ---
        exercise_item = page.locator("li:has-text('Push-up')")
        expect(exercise_item).to_be_visible()

        exercise_image = exercise_item.locator(".exercise-img")
        expect(exercise_image).to_be_visible()
        expect(exercise_image).to_have_attribute("src", f"/uploads/{secure_filename(DUMMY_IMAGE_NAME)}")

        # --- 5. Edit Exercise ---
        exercise_item.get_by_role("button", name="Edit").click()
        expect(page.locator("#edit-modal")).to_be_visible()
        page.locator("#edit-reps-input").fill("20")
        page.get_by_role("button", name="Guardar Cambios").click()
        expect(page.locator("li:has-text('Push-up')").locator("span:has-text('20 reps')")).to_be_visible()

        # --- 6. Take Screenshot ---
        page.screenshot(path="jules-scratch/verification/verification.png")

        # --- 7. Cleanup ---
        page.on("dialog", lambda dialog: dialog.accept())
        page.locator("li:has-text('Push-up')").get_by_role("button", name="Delete").click()
        expect(page.locator("li:has-text('Push-up')")).to_be_hidden()

        page.get_by_role("button", name="← Volver a Grupos Musculares").click()
        page.locator("li:has-text('E2E Test Group')").get_by_role("button", name="Delete").click()
        expect(page.locator("li:has-text('E2E Test Group')")).to_be_hidden()

        browser.close()
        os.remove(DUMMY_IMAGE_NAME)

def secure_filename(filename: str) -> str:
    # A basic version of werkzeug's secure_filename for the test
    _secure_filename_re = re.compile(r"[^A-Za-z0-9_.-]")
    return _secure_filename_re.sub("_", filename)

import re

if __name__ == "__main__":
    run_verification()
