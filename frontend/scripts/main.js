import Search from "./modules/search";
import Chat from "./modules/chat";
import RegistrationForm from "./modules/registrationForm";

// Execute the search only if the visitor is logged in.
if (document.querySelector(".header-search-icon")) {
  new Search();
}

// Execute the chat only if the visitor is logged in.
if (document.querySelector(".js-chat")) {
  new Chat();
}

// Execute only if the registration form exist in the current page
if (document.querySelector(".js-registrationForm")) {
  new RegistrationForm();
}
