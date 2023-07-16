export const scrollToElement = (element) => {
    if (typeof element === 'string') element = document.querySelector(element);
    if (element) {
        window.scrollTo({
            top: element.getBoundingClientRect().top + window.pageYOffset - document.querySelector('nav.navbar').offsetHeight - parseFloat(getComputedStyle(document.documentElement).fontSize),
            behavior: 'smooth',
        });
    }
}
