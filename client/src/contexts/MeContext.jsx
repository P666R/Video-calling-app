import { createContext, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

export const MeContext = createContext(null);

export const MeContextProvider = (props) => {
  const [me, setMe] = useState('');

  const contextValue = useMemo(() => ({ me, setMe }), [me, setMe]);

  return (
    <MeContext.Provider value={contextValue}>
      {props.children}
    </MeContext.Provider>
  );
};

MeContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
