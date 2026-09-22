console.log("script.js loaded");

const menuToggle = document.querySelector(".menu-toggle");
const navbar = document.querySelector(".navbar");

if (menuToggle && navbar) {
  menuToggle.addEventListener("click", () => {
    navbar.classList.toggle("active");
    const expanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!expanded));
    menuToggle.setAttribute("aria-label", expanded ? "Open navigation" : "Close navigation");
  });
}

const contactForm = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");

if (contactForm && formStatus) {
  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = contactForm.querySelector("button[type='submit']");
    submitButton.disabled = true;
    formStatus.textContent = "Sending your enquiry...";
    formStatus.className = "form-status";

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(contactForm))),
      });
      const responseText = await response.text();
      let result = {};

      if (!responseText) {
        throw new Error(`The server returned an empty response (${response.status}). Start it with npm start and try again.`);
      }

      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(`The server returned an unexpected response (${response.status}).`);
      }

      if (!response.ok) {
        throw new Error(result.error || "Unable to send your enquiry.");
      }

      formStatus.textContent = result.message;
      formStatus.className = "form-status success";
      contactForm.reset();
    } catch (error) {
      formStatus.textContent = error.message === "Failed to fetch"
        ? "The backend is not running. Start it with npm start, then try again."
        : error.message;
      formStatus.className = "form-status error";
    } finally {
      submitButton.disabled = false;
    }
  });
}