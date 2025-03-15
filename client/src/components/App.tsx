import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Dashboard from './Dashboard';
import ImageGallery from './ImageGallery';
import './styles/index.css';

const App: React.FC = () => {
  return (
    <Router>
      <div className="app">
        <Switch>
          <Route path="/" exact component={Dashboard} />
          <Route path="/gallery" component={ImageGallery} />
        </Switch>
      </div>
    </Router>
  );
};

export default App;