import React from 'react';
import { Router, Route, Switch, Redirect } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { library } from '@fortawesome/fontawesome-svg-core'
import Navbar from './components/Navbar/Navbar';
import LoginForm from './components/LoginForm/LoginForm';
import RegisterForm from './components/RegisterForm/RegisterForm';
import ErrorPage from './components/Error/Error';
import VideoList from './components/VideoList/VideoList';
import GlobalPasswordForm from './components/GlobalPasswordForm/GlobalPasswordForm';
import Logout from './components/Logout/Logout';
import SettingsPage from './components/Settings/Settings';
import AdminPage from './components/Admin/Admin';
import StatisticsPage from './components/Statistics/Statistics';
import VideoPage from './components/Video/Video';
import Page from './components/Page/Page';
import UploaderPage from './components/Uploader/Uploader';
import UserContext from './contexts/user.context';
import UploaderList from './components/UploaderList/UploaderList';
import history from './utilities/history.utility';
import { faEye, faCamera, faTachometerAlt, faFile, faExternalLinkAlt, faCaretRight, faUser, faList, faVideo, faClock, faThumbsUp, faThumbsDown, faHourglassEnd, faRandom, faSearch, faFilter, faCalendarAlt, faPlus, faBriefcase, faDownload, faPlay, faHandPaper, faMapMarkerAlt, faTv } from '@fortawesome/free-solid-svg-icons';

library.add(faEye, faCamera, faTachometerAlt, faFile, faExternalLinkAlt, faCaretRight, faUser, faList, faVideo, faClock, faThumbsUp, faThumbsDown, faHourglassEnd, faRandom, faSearch, faFilter, faCalendarAlt, faPlus, faBriefcase, faDownload, faPlay, faHandPaper, faMapMarkerAlt, faTv);

function App() {
	return (
		<Router history={history}>
			<UserContext>
				<Navbar />
				<Container className="my-4">
					<Switch>
						<Redirect from="/:url*(/+)" to={history.location.pathname.slice(0, -1)} />
						<Route
							path={['/', '/videos']}
							exact
							render={(props) =>
								<VideoList
									url="videos/search"
									stats
									{...props}
								/>
							}
						/>
						<Route
							path={['/uploaders', '/uploaders/page/:page']}
							exact
							render={(props) =>
								<UploaderList
									{...props}
								/>
							}
						/>
						<Route
							path="/videos/:extractor/:id"
							exact
							render={(props) =>
								<VideoPage {...props} />
							}
						/>
						<Route
							path="/uploaders/:extractor/:name/"
							exact
							render={(props) => <UploaderPage {...props} />
							}
						/>
						<Route
							path="/statistics"
							exact
							component={StatisticsPage}
						/>
						<Route
							path="/login"
							exact
							render={() =>
								<Page clamp="350px">
									<LoginForm />
								</Page>
							}
						/>
						<Route
							path="/register"
							exact
							render={() =>
								<Page clamp="350px">
									<RegisterForm />
								</Page>
							}
						/>
						<Route
							path="/settings"
							exact
							component={SettingsPage}
						/>
						<Route
							path="/admin"
							exact
							component={AdminPage}
						/>
						<Route
							path="/logout"
							exact
							component={Logout}
						/>
						<Route
							path="/global"
							exact
							render={() =>
								<Page clamp="350px" title={window.documentTitle}>
									<GlobalPasswordForm />
								</Page>
							}
						/>
						<Route
							render={() =>
								<ErrorPage error="404 - Not Found" />
							}
						/>
					</Switch>
				</Container>
				<div className="mt-auto bg-light text-center">
					<Container style={{ padding: '2rem 1rem' }}>

						<a
							className="text-dark"
							href={window.gitHubLink}
							target="_blank"
							rel="noopener noreferrer"
						>
							To get new releases or submit issues check out the project on GitHub <FontAwesomeIcon icon="external-link-alt" />
						</a>
						<span className="d-block">Version: {window.scriptVersion}</span>
					</Container>
				</div>
			</UserContext>
		</Router>
	);
}

export default App;
