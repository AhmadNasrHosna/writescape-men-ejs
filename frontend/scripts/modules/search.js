import axios from "axios";
import moment from "moment";
import DOMPurify from "dompurify";

export default class Search {
  // 1. Select DOM elements, and keep track of any useful data
  constructor() {
    this.injectHTML();
    this.liveSearchOpenTrigger = document.querySelector(".header-search-icon");
    this.liveSearchCloseTrigger = document.querySelector(".close-live-search");
    this.liveSearchOverlay = document.querySelector(".search-overlay");
    this.liveSearchInputField = document.querySelector(".live-search-field");
    this.liveSearchResultsArea = document.querySelector(".live-search-results");
    this.loaderIcon = document.querySelector(".circle-loader");
    this.typingWaitTimer;
    this.previousValue = "";
    this.events();
  }

  // 2. Events
  events() {
    this.liveSearchOpenTrigger.addEventListener("click", (e) => {
      e.preventDefault();
      this.openOverlay();
    });

    this.liveSearchCloseTrigger.addEventListener("click", () =>
      this.closeOverlay()
    );

    this.liveSearchInputField.addEventListener("keyup", () =>
      this.keyPressHandler()
    );
  }

  // 3. Methods

  keyPressHandler() {
    let searchInputValue = this.liveSearchInputField.value;

    if (searchInputValue == "") {
      clearTimeout(this.typingWaitTimer);
      this.hideLoaderIcon();
      this.hideLiveSearchResultsArea();
    }

    if (
      searchInputValue != "" &&
      searchInputValue != this.previousValue &&
      !!searchInputValue.trim()
    ) {
      // previous value comes to prevent sendRequest func from running if the user press on any key but letter key on number key like arrow keys before or through typing
      clearTimeout(this.typingWaitTimer);
      this.showLoaderIcon();
      this.hideLiveSearchResultsArea();
      this.typingWaitTimer = setTimeout(() => this.sendRequest(), 500);
    }

    this.previousValue = searchInputValue;
  }

  sendRequest() {
    axios
      .post("/search", {
        searchTerm: this.liveSearchInputField.value,
      })
      .then((response) => {
        this.renderSearchResultsInHTML(response.data);
      })
      .catch(() => alert("failed"));
  }

  renderSearchResultsInHTML(posts) {
    if (posts.length) {
      this.liveSearchResultsArea.innerHTML = DOMPurify.sanitize(`
      <div class="list-group shadow-sm">
        <div class="list-group-item active">
          <strong>Search Results</strong>
          (${posts.length > 1 ? `${posts.length} items found` : `1 item found`})
        </div>
        ${posts
          .map((post) => {
            return `
            <a href="/post/${
              post._id
            }" class="list-group-item list-group-item-action">
              <img class="avatar-tiny" src="${post.author.avatar}">
              <strong>${post.title}</strong>
              <span class="text-muted small">
                by ${post.author.username}
                on ${moment(post.createdDate).calendar()}
              </span>
            </a>`;
          })
          .join("")}
      </div>`);
    } else {
      this.liveSearchResultsArea.innerHTML = `<p class="alert alert-danger text-center shadow-sm">Sorry, we could not find any results for that search.</p>`;
    }

    this.hideLoaderIcon();
    this.showLiveSearchResultsArea();
  }

  showLiveSearchResultsArea() {
    this.liveSearchResultsArea.classList.add("live-search-results--visible");
  }

  hideLiveSearchResultsArea() {
    this.liveSearchResultsArea.classList.remove("live-search-results--visible");
  }

  showLoaderIcon() {
    this.loaderIcon.classList.add("circle-loader--visible");
  }

  hideLoaderIcon() {
    this.loaderIcon.classList.remove("circle-loader--visible");
  }

  openOverlay() {
    this.liveSearchOverlay.classList.add("search-overlay--visible");
    this.liveSearchInputField.focus();
  }

  closeOverlay() {
    this.liveSearchOverlay.classList.remove("search-overlay--visible");
    this.hideLiveSearchResultsArea();
    this.liveSearchInputField.value = "";
  }

  injectHTML() {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="search-overlay">
        <div class="search-overlay-top shadow-sm">
          <div class="container container--narrow">
            <label for="live-search-field" class="search-overlay-icon"><i class="fas fa-search"></i></label>
            <input type="text" id="live-search-field" class="live-search-field" placeholder="What are you interested in?">
            <span class="close-live-search"><i class="fas fa-times-circle"></i></span>
          </div>
        </div>
        <div class="search-overlay-bottom">
          <div class="container container--narrow py-3">
            <div class="circle-loader"></div>
            <div class="live-search-results"></div>
          </div>
        </div>
      </div>`
    );
  }
}
