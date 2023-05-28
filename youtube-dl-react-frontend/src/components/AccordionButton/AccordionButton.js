import { Button } from 'react-bootstrap';
import { useAccordionButton } from 'react-bootstrap/AccordionButton';

export default function ToggleButton(props) {
    const decoratedOnClick = useAccordionButton(props.eventKey, () => {});

    return (
        <Button
            onClick={decoratedOnClick}
            variant={props.variant}
            className={props.className}
        >
            {props.children}
        </Button>
    );
}