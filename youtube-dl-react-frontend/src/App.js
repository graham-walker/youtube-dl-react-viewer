import React from 'react';
import { Router, Route, Switch, Redirect } from 'react-router-dom';
import { Container } from 'react-bootstrap';
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
import TagsList from './components/TagsList/TagsList';
import VideoPage from './components/Video/Video';
import Page from './components/Page/Page';
import UploaderPage from './components/Uploader/Uploader';
import Playlist from './components/Playlist/Playlist';
import Job from './components/Job/Job';
import ActivityPage from './components/Activity/Activity';
import UserContext from './contexts/user.context';
import UploaderList from './components/UploaderList/UploaderList';
import history from './utilities/history.utility';
import { faEye, faCamera, faTachometerAlt, faFile, faExternalLinkAlt, faCaretRight, faUser, faList, faVideo, faClock, faThumbsUp, faThumbsDown, faHourglassEnd, faRandom, faSearch, faFilter, faCalendarAlt, faPlus, faBriefcase, faDownload, faPlay, faHandPaper, faMapMarkerAlt, faTv, faBalanceScale, faHistory, faHeart, faInfoCircle, faDatabase, faCircleHalfStroke, faSun, faMoon, faRotateRight, faRotateLeft, faTrash, faPause, faPencil, faHeadphones } from '@fortawesome/free-solid-svg-icons';
import parsedEnv from './parse-env';

library.add(faEye, faCamera, faTachometerAlt, faFile, faExternalLinkAlt, faCaretRight, faUser, faList, faVideo, faClock, faThumbsUp, faThumbsDown, faHourglassEnd, faRandom, faSearch, faFilter, faCalendarAlt, faPlus, faBriefcase, faDownload, faPlay, faHandPaper, faMapMarkerAlt, faTv, faBalanceScale, faHistory, faHeart, faInfoCircle, faDatabase, faCircleHalfStroke, faSun, faMoon, faRotateRight, faRotateLeft, faTrash, faPause, faPencil, faHeadphones);

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
							path="/uploaders/:extractor/:id/"
							exact
							render={(props) => <UploaderPage {...props} />
							}
						/>
						<Route
							path="/playlists/:extractor/:id/"
							exact
							render={(props) => <Playlist {...props} />
							}
						/>
						<Route
							path="/jobs/:_id/"
							exact
							render={(props) => <Job {...props} />
							}
						/>
						<Route
							path="/statistics"
							exact
							component={StatisticsPage}
						/>
						<Route
							path="/tags"
							exact
							component={TagsList}
						/>
						<Route
							path="/login"
							exact
							render={(props) =>
								<Page clamp="350px">
									<LoginForm {...props} />
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
							path="/activity"
							exact
							component={ActivityPage}
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
								<Page clamp="350px" title={parsedEnv.REACT_APP_BRAND}>
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
			</UserContext>
		</Router>
	);
}

export default App;
