import axios from "axios";

export default class RegistrationForm {
  constructor() {
    this._csrf = document.querySelector("[name='_csrf']").value;
    this.form = document.querySelector(".js-registrationForm");
    this.formFields = document.querySelectorAll(
      ".js-registrationForm .form-control"
    );
    this.username = document.querySelector("#username-register");
    this.username.previousValue = "";
    this.username.isUnique = false;
    this.email = document.querySelector("#email-register");
    this.email.previousValue = "";
    this.email.isUnique = false;
    this.password = document.querySelector("#password-register");
    this.password.previousValue = "";
    this.insertValidationElements();
    this.events();
  }

  // Events

  events() {
    this.form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.formSubmitHandler();
    });

    // Prevent any kind of space by any kind of insert data for username name field.
    this.username.addEventListener("input", () => {
      this.removeSpacesFromInputValue(this.username);
    });

    this.username.addEventListener("keyup", () => {
      this.isEmpty(this.username);
      this.isDifferent(this.username, this.usernameHandler);
    });

    // Prevent any kind of space by any kind of insert data for username name field.
    this.email.addEventListener("input", () => {
      this.removeSpacesFromInputValue(this.email);
    });

    this.email.addEventListener("keyup", () => {
      this.isEmpty(this.email);
      this.isDifferent(this.email, this.emailHandler);
    });

    this.password.addEventListener("keyup", () => {
      this.isEmpty(this.password);
      this.isDifferent(this.password, this.passwordHandler);
    });

    this.username.addEventListener("blur", () => {
      this.isEmpty(this.username);
      this.isDifferent(this.username, this.usernameHandler);
    });

    this.email.addEventListener("blur", () => {
      this.isEmpty(this.email);
      this.isDifferent(this.email, this.emailHandler);
    });

    this.password.addEventListener("blur", () => {
      this.isEmpty(this.password);
      this.isDifferent(this.password, this.passwordHandler);
    });
  }

  // Methods

  formSubmitHandler() {
    this.usernameImmediately();
    this.usernameAfterDelay();
    this.emailAfterDelay();
    this.passwordImmediately();
    this.passwordAfterDelay();

    // If everything is perfect and there are no errors, then let the form submit
    if (
      this.username.isUnique &&
      !this.username.errors &&
      this.email.isUnique &&
      !this.email.errors &&
      !this.password.errors
    ) {
      this.form.submit();
    }
  }

  removeSpacesFromInputValue(input) {
    if (/\s/.test(input.value)) {
      input.value = input.value.split(" ").join("");
    }
  }

  isDifferent(el, handler) {
    // Check if the field's value has changed after that key press
    let previousValue = el.previousValue;
    let currentValue = el.value;

    if (previousValue != currentValue) {
      handler.call(this);
    }

    previousValue = currentValue;
  }

  usernameHandler() {
    // After a new key press and only if there were no errors in
    // the new field's value, then hide the latest error message.
    this.hideValidationError(this.username);

    this.usernameImmediately();

    clearTimeout(this.username.timer);
    this.username.timer = setTimeout(() => this.usernameAfterDelay(), 750);
  }

  emailHandler() {
    // After a new key press and only if there were no errors in
    // the new field's value, then hide the latest error message.
    this.hideValidationError(this.email);
    clearTimeout(this.email.timer);
    this.email.timer = setTimeout(() => this.emailAfterDelay(), 750);
  }

  passwordHandler() {
    // After a new key press and only if there were no errors in
    // the new field's value, then hide the latest error message.
    this.hideValidationError(this.password);

    this.passwordImmediately();

    clearTimeout(this.password.timer);
    this.password.timer = setTimeout(() => this.passwordAfterDelay(), 750);
  }

  usernameImmediately() {
    // Check for alphanumeric
    if (
      this.username.value != "" &&
      !/^([a-zA-Z0-9]+)$/.test(this.username.value)
    ) {
      this.showValidationError(
        this.username,
        "Username can only contain letters or numbers."
      );
    }

    // If username length exceeds 30 characters.
    if (this.username.value.length > 30) {
      this.showValidationError(
        this.username,
        "Username cannot exceed 30 characters."
      );
    }
  }

  passwordImmediately() {
    // If the password length is greater than 50
    if (this.password.value.length > 50) {
      this.showValidationError(
        this.password,
        "Password cannot exceed 50 characters."
      );
    }
  }

  passwordAfterDelay() {
    // If there were no errors from the very first time, then add valid style to the current input field
    this.addValidFieldStyle(this.password);

    // If the password length less than 3 characters
    if (this.password.value.length < 12) {
      this.showValidationError(
        this.password,
        "Password must be at least 12 characters."
      );
    }
  }

  usernameAfterDelay() {
    // If there were no errors from the very first time, then add valid style to the current input field
    this.addValidFieldStyle(this.username);

    // If username length less than 3 characters.
    if (this.username.value.length < 3) {
      this.showValidationError(
        this.username,
        "Username must be at least 3 characters."
      );
    }

    // If the username has already been taken
    if (!this.username.errors) {
      // if no errors, then run the following code
      axios
        .post("/doesUserNameExist", {
          _csrf: this._csrf,
          username: this.username.value,
        })
        .then((response) => {
          if (response.data) {
            this.username.isUnique = false; // false means that the username field' value has an error and must change.

            this.showValidationError(
              this.username,
              "That username is already taken."
            );
          } else {
            this.username.isUnique = true; // now true means that the username field' value is unique username and the field's value han no errors.
          }
        })
        .catch(() => {
          console.log("Please try again later.");
        });
    }
  }

  emailAfterDelay() {
    // If there were no errors from the very first time, then add valid style to the current input field
    this.addValidFieldStyle(this.email);

    // If the field's value format looks nothing like an email address
    if (!/^\S+@\S+\.\S+$/.test(this.email.value)) {
      // If was invalid format
      this.showValidationError(
        this.email,
        "You must provide a valid email address."
      );
    } else {
      this.hideValidationError(this.email);
    }

    // If the email has already been used
    if (!this.email.errors) {
      // if no errors, then run the following code
      axios
        .post("/doesEmailExist", {
          _csrf: this._csrf,
          email: this.email.value,
        })
        .then((response) => {
          if (response.data) {
            this.email.isUnique = false; // false means that the email field' value has an error and must change.

            this.showValidationError(
              this.email,
              "That email is already being used."
            );
          } else {
            this.email.isUnique = true; // now true means that the email field' value is unique email and the field's value han no errors.
          }
        })
        .catch(() => {
          console.log("Please try again later.");
        });
    }
  }

  showValidationError(el, message) {
    el.nextElementSibling.innerHTML = message;
    el.nextElementSibling.classList.add("liveValidateMessage--visible");
    el.classList.add("has-error");

    if (el.classList.contains("is-valid")) {
      el.classList.remove("is-valid");
    }

    el.errors = true;
  }

  hideValidationError(el) {
    if (el.classList.contains("has-error")) {
      el.nextElementSibling.classList.remove("liveValidateMessage--visible");
      el.classList.remove("has-error");
    }

    el.errors = false;
  }

  isEmpty(el) {
    if (el.value == "") {
      this.showValidationError(el, "Please fill out this field.");
      el.errors = true;
    }
  }

  addValidFieldStyle(el) {
    if (!el.classList.contains("has-error")) {
      el.classList.add("is-valid");
    }
  }

  insertValidationElements() {
    this.formFields.forEach((field) => {
      field.insertAdjacentHTML(
        "afterend",
        `<div class="alert alert-danger small liveValidateMessage"></div>`
      );
    });
  }
}
