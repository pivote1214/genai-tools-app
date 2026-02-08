import '@testing-library/jest-dom';

// scrollIntoViewのモック
Element.prototype.scrollIntoView = () => {};
