/* This Node.js script automatically runs download jobs at a specified time using a cron scheduler
 * 
 * USAGE:
 * 1. Create and copy an API key in the admin panel
 * 2. Copy the IDs of the jobs you want to schedule. Job IDs can be found under advanced options in the job editor in the admin panel
 * 3. Install Node.js https://nodejs.org/en
 * 4. Create a new folder and inside create a new file named index.js and paste the code below
 * 5. Replace webAppUrl, apiKey, jobIds, and cronSchedule in index.js with your values
 * 6. Create a new Node.js project `npm init`
 * 7. Install the cron package `npm i cron`
 * 8. Start the script `node index.js`
 */

const { CronJob } = require('cron');

(async () => {
    const webAppUrl = 'http://localhost:5000'; // Replace with your web app URL
    const apiKey = 'ytdlrv-api-1740349357349-5f3976f694655ece89f0bfac6f798b9f88e3f031942aaac5e82c8eb276aee3a3'; // Replace with your API key
    const jobIds = ['678053b54e5a734c862f66aa', '678053fe4e5a734c862f66ab', '678054054e5a734c862f66ac']; // Replace with the Job IDs you want to schedule
    const cronSchedule = '0 0 * * *'; // This will run once every new UTC day by default. See https://crontab.guru/ for how to configure

    new CronJob(
        cronSchedule,
        scheduleDownloadJobs,
        null,
        true,
        'UTC',
    );

    async function scheduleDownloadJobs() {
        console.log('Running scheduled download jobs');
        try {
            const response = await fetch(webAppUrl + '/api/admin/jobs/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': `key=${apiKey}`,
                },
                body: JSON.stringify(jobIds),
            });

            if (!response.ok) throw new Error(`Request failed with status: ${response.status}`);

            const data = await response.json();
            console.log('Success:', data);
        } catch (err) {
            console.error(err);
        }
    }
})();
