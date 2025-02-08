import React, { useRef, useState } from 'react';
import { Dropdown, Alert } from 'react-bootstrap';

const ImportSubscriptionsButton = ({ emit, className }) => {
    const fileInputRef = useRef(null);
    const parseMethod = useRef(null);
    const [errorMessage, setErrorMessage] = useState(null);

    const handleSelect = (method) => {
        parseMethod.current = method;
        switch (method) {
            case 'youtube_subscriptions_csv':
                fileInputRef.current.accept = '.csv';
                break;
            case 'newpipe_subscriptions_json':
                fileInputRef.current.accept = '.json';
                break;
            default:
                fileInputRef.current.accept = '*';
        }
        fileInputRef.current.click();
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            if (parseMethod.current === 'youtube_subscriptions_csv') {
                parseYoutubeSubscriptionsCsv(content);
            } else if (parseMethod.current === 'newpipe_subscriptions_json') {
                ParseNewpipeSubscriptionsJson(content);
            }
        };

        reader.readAsText(file);
    };

    const parseYoutubeSubscriptionsCsv = (content) => {
        try {
            let rows = content.split('\n')
            let header = rows.shift().split(',');
            if (header[1] !== 'Channel Url' || header[2] !== 'Channel Title') throw new Error('Wrong headers');
            let subscriptionsText = '';
            for (let row of rows) {
                if (!row) continue;
                row = row.split(',');
                subscriptionsText += `# ${row[2]}\n${row[1].replace('http://', 'https://')}\n\n`;
            }

            setErrorMessage(null);
            emit(subscriptionsText.replace(/\n*$/, '\n'));
        } catch (err) {
            console.error(err);
            setErrorMessage('Invalid YouTube subscriptions.csv');
        }
    };

    const ParseNewpipeSubscriptionsJson = (content) => {
        try {
            const parsed = JSON.parse(content);

            if (!parsed.hasOwnProperty('subscriptions') || !Array.isArray(parsed.subscriptions)) throw new Error('Missing subscriptions property');
            
            let subscriptionsText = '';
            for (let row of parsed.subscriptions) {
                if (!row.hasOwnProperty('url') || !row.hasOwnProperty('name')) throw new Error('Missing row property');
                subscriptionsText += `# ${row.name}\n${row.url}\n\n`;
            }

            setErrorMessage(null);
            emit(subscriptionsText.replace(/\n*$/, '\n'));
        } catch (err) {
            console.error(err);
            setErrorMessage('Invalid NewPipe subscriptions.json');
        }
    };

    return (
        <div className={className}>
            {errorMessage && <Alert variant="danger">{errorMessage}</Alert>}
            <Dropdown>
                <Dropdown.Toggle variant="primary">Import Subscriptions From</Dropdown.Toggle>
                <Dropdown.Menu>
                    <Dropdown.Item onClick={() => handleSelect('youtube_subscriptions_csv')}>
                        YouTube subscriptions.csv
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => handleSelect('newpipe_subscriptions_json')}>
                        NewPipe subscriptions.json
                    </Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>

            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleFileChange}
                accept=".csv, .json"
            />
        </div>
    );
};

export default ImportSubscriptionsButton;
