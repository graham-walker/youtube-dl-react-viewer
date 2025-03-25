import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Dropdown } from "react-bootstrap";

export default function ThemeController(props) {
    const { theme, onThemeChange } = props;

    let icon = 'circle-half-stroke';
    if (theme === 'light') icon = 'sun';
    if (theme === 'dark') icon = 'moon';

    return (
        <Dropdown className={props.className} align="end">
            <Dropdown.Toggle className="theme-controller" title="Theme" aria-label="Change theme">
                <FontAwesomeIcon icon={icon} />
            </Dropdown.Toggle>

            <Dropdown.Menu>
                <Dropdown.Item onClick={() => onThemeChange('light')}><FontAwesomeIcon icon="sun" /> Light</Dropdown.Item>
                <Dropdown.Item onClick={() => onThemeChange('dark')}><FontAwesomeIcon icon="moon" /> Dark</Dropdown.Item>
                <Dropdown.Item onClick={() => onThemeChange('auto')}><FontAwesomeIcon icon="circle-half-stroke" /> Auto</Dropdown.Item>
            </Dropdown.Menu>
        </Dropdown>
    );
}
