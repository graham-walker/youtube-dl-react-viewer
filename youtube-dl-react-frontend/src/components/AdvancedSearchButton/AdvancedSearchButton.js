import { useContext } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AdvancedSearchContext } from '../../contexts/advancedsearch.context';
import { Button } from 'react-bootstrap';

const AdvancedSearchButton = props => {
    const advancedSearchContext = useContext(AdvancedSearchContext);

    return (
        <Button
            title={props.title}
            aria-label={props.title}
            variant={props.variant}
            onClick={() => {
                advancedSearchContext.setShow(true);
                if (props.query) advancedSearchContext.setNewQuery(props.query);
            }}
        >
            {props.children || <FontAwesomeIcon icon="search" />}
        </Button>
    );
}

export default AdvancedSearchButton;
