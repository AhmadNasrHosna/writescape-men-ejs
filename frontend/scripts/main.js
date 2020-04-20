import Search from "./modules/search";

// If was just a visitor not actually a registered user don't run.
if (document.querySelector(".header-search-icon")) {
  new Search();
}
