const START_PAGE = 'newtab.html';

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL(START_PAGE) });
});
