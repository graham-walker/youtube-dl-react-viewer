import React, { useContext } from 'react';
import { Image, Form } from 'react-bootstrap';
import { defaultImage } from '../../../utilities/image.utility';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { UserContext } from '../../../contexts/user.context';

const AvatarForm = (props) => {
    const userContext = useContext(UserContext);

    return (
        <Form.Group className="avatar-form-group" controlId={props.name}>
            <Image
                width={props.width ?? 145}
                height={props.height ?? 145}
                src={props.src + (props.imageKey ? ('?i=' + props.imageKey) : '')}
                onError={(e) => { defaultImage(e, 'avatar') }}
                roundedCircle={userContext.getSetting('useCircularAvatars')}
                className="mb-1 mb-lg-0"
            />
            <Form.Control
                type="file"
                name={props.name}
                onChange={props.onChange}
                className={userContext.getSetting('useCircularAvatars') ? 'rounded-circle' : undefined}
            />
            <div className={`avatar-focus-outline${userContext.getSetting('useCircularAvatars') ? ' rounded-circle' : ''}`}></div>
            <Form.Label className={`avatar-edit-overlay${userContext.getSetting('useCircularAvatars') ? ' rounded-circle' : ''}`}>
                <FontAwesomeIcon className="text-white" icon="pencil" />
            </Form.Label>
        </Form.Group>
    );
}

export default AvatarForm;
