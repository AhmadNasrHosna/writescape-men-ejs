import DOMPurify from "dompurify";

export default class Chat {
  constructor() {
    this.hasOpenedYet = false;
    this.chat = document.querySelector(".js-chat");
    this.chatWrapper = document.querySelector(".js-chatWrapper");
    this.openChatTrigger = document.querySelector(".js-openChatTrigger");
    this.injectHTML();
    this.closeChatTrigger = document.querySelector(".js-closeChatTrigger");
    this.chatForm = document.querySelector(".js-chatForm");
    this.chatField = document.querySelector(".js-chatField");
    this.chatLog = document.querySelector(".js-chatLog");
    this.events();
  }

  // Events
  events() {
    this.openChatTrigger.addEventListener("click", () => {
      this.hideNotification();
      this.showChat();
    });
    this.closeChatTrigger.addEventListener("click", () => this.hideChat());
    this.chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      this.sendMessageToServer();
    });
  }

  // Methods

  sendMessageToServer() {
    this.socket.emit("chatMessageFromBrowser", {
      message: this.chatField.value,
    });

    this.chatLog.insertAdjacentHTML(
      "beforeend",
      DOMPurify.sanitize(`
        <div class="c-chat__self">
          <div class="c-chat__message">
            <div class="c-chat__message-inner">
              ${this.chatField.value}
            </div>
          </div>
          <img class="c-chat__avatar avatar-tiny" src="${this.avatar}" title="${this.username}">
        </div>
      `)
    );

    this.scrollToTheNewMessage();
    this.clearChatField();
    this.setFocusOnChatField();
  }

  scrollToTheNewMessage() {
    this.chatLog.scrollTop = this.chatLog.scrollHeight;
  }

  clearChatField() {
    this.chatField.value = "";
  }

  setFocusOnChatField() {
    this.chatField.focus();
  }

  showChat() {
    this.chat.classList.toggle("is-visible");
    this.setFocusOnChatField();

    // Opening a connection to the server
    // Only when the user open the chat box for the very first time.
    if (!this.hasOpenedYet) {
      this.openConnection();
    }

    this.hasOpenedYet = true;
  }

  hideChat() {
    this.chat.classList.remove("is-visible");
  }

  showNotification() {
    if (!this.chat.classList.contains("is-visible")) {
      this.openChatTrigger.classList.add("show-notification");
    }
  }

  hideNotification() {
    if (this.openChatTrigger.classList.contains("show-notification")) {
      this.openChatTrigger.classList.remove("show-notification");
    }
  }

  renderMessageFromServer(data) {
    this.chatLog.insertAdjacentHTML(
      "beforeend",
      DOMPurify.sanitize(`
        <div class="c-chat__other">
          <a href="/profile/${data.username}"><img class="avatar-tiny" src="${data.avatar}"></a>
          <div class="c-chat__message">
            <div class="c-chat__message-inner">
              <a href="/profile/${data.username}"><strong>${data.username}:</strong></a>
              ${data.message}
            </div>
          </div>
        </div>
      `)
    );

    this.showNotification();
    this.scrollToTheNewMessage();
  }

  openConnection() {
    this.socket = io();

    this.socket.on("welcome", (data) => {
      this.username = data.username;
      this.avatar = data.avatar;
    });

    this.socket.on("chatMessageFromServer", (data) => {
      this.renderMessageFromServer(data);
    });
  }

  injectHTML() {
    this.chatWrapper.innerHTML = `
      <div class="c-chat__titlebar"> Chat
        <span class="c-chat__close js-closeChatTrigger">
          <i class="fas fa-times-circle"></i>
        </span>
      </div>

      <div class="c-chat__log js-chatLog"></div>

      <form class="c-chat__form border-top js-chatForm">
        <input type="text" class="c-chat__field js-chatField" placeholder="Type a message…" autocomplete="off">
      </form>
    `;
  }
}
