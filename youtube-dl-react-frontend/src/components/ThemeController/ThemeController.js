import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react"
import { Dropdown } from "react-bootstrap";

export default function ThemeController(props) {
    const { onThemeChange } = props;

    const [theme, setTheme] = useState('auto');

    let icon = 'circle-half-stroke';
    if (theme === 'light') icon = 'sun';
    if (theme === 'dark') icon = 'moon';

    useEffect(() => {
        setTheme(localStorage.getItem('theme') || 'auto');
    }, []);

    useEffect(() => {
        localStorage.setItem('theme', theme);
        if (theme === 'auto') {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                onThemeChange('dark');
                document.documentElement.setAttribute('data-bs-theme', 'dark');
            } else {
                onThemeChange('light');
                document.documentElement.setAttribute('data-bs-theme', 'light');
            }
        } else {
            onThemeChange(theme);
            document.documentElement.setAttribute('data-bs-theme', theme);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [theme]);

    return (
        <Dropdown className="ms-xl-3 d-xl-flex" align="end">
            <Dropdown.Toggle id="theme-controller">
                <FontAwesomeIcon icon={icon} />
            </Dropdown.Toggle>

            <Dropdown.Menu>
                <Dropdown.Item onClick={() => setTheme('light')}><FontAwesomeIcon icon="sun" /> Light</Dropdown.Item>
                <Dropdown.Item onClick={() => setTheme('dark')}><FontAwesomeIcon icon="moon" /> Dark</Dropdown.Item>
                <Dropdown.Item onClick={() => setTheme('auto')}><FontAwesomeIcon icon="circle-half-stroke" /> Auto</Dropdown.Item>
            </Dropdown.Menu>
        </Dropdown>
    );

}