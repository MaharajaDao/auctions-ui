/** @jsx jsx */

import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  Heading,
  Text,
  jsx,
  Button,
  Grid,
  Box,
  Styled,
  Label,
  Input,
  Flex
} from 'theme-ui';
import BigNumber from 'bignumber.js';
import Moment from 'react-moment';
import EventsList from './AuctionEventsList';
import MiniFormLayout from './MiniFormLayout';
import useAuctionActions from '../hooks/useAuctionActions';

const AuctionEvent = ({
  type,
  ilk,
  lot,
  bid,
  currentBid,
  timestamp,
  tx,
  sender
}) => {
  const fields = [
    ['Event Type', type],
    ['Lot Size', lot],
    ['Current Bid Price', currentBid],
    ['Bid Value', bid],
    ['Timestamp', timestamp],
    [
      'Tx',
      <a href={`https://etherscan.io/tx/${tx}`} target="_blank">
        {' '}
        {tx.slice(0, 7) + '...' + tx.slice(-4)}
      </a>
    ],
    [
      'Sender',
      <a href={`https://etherscan.io/address/${sender}`} target="_blank">
        {' '}
        {sender.slice(0, 7) + '...' + sender.slice(-4)}
      </a>
    ]
  ];
  return (
    <Grid
      gap={2}
      columns={[2, 4, 7]}
      sx={{
        bg: 'background',
        p: 5,
        borderRadius: 5
      }}
    >
      {fields.map(([title, value]) => {
        return (
          <Box key={title}>
            <Text
              variant="caps"
              sx={{
                fontSize: '10px',
                mb: 2
              }}
            >
              {title}
            </Text>
            <Text
              sx={{
                fontSize: 1
              }}
            >
              {value}
            </Text>
          </Box>
        );
      })}
    </Grid>
  );
};

const byTimestamp = (prev, next) => {
  const nextTs = new Date(next.timestamp).getTime();
  const prevTs = new Date(prev.timestamp).getTime();

  if (nextTs > prevTs) return 1;
  if (nextTs < prevTs) return -1;
  if (nextTs === prevTs) {
    if (next.type === 'Dent') return 1;
    if (next.type === 'Deal') return 2;
    if (next.type === 'Kick') return -1;
  }
  return 0;
};


export default ({ events, id: auctionId, end, tic, }) => {
  const [timer, setTimer] = useState([]);

  useEffect(() => {
    // if there is no Dent first will be Kick
    // If there is Deal first will be Deal
    // If first is Dent it's an ongoing auction
    const hasDent = sortedEvents[0].type === 'Dent';

    var countDownDate = new Date((hasDent ? tic : end).toNumber()).getTime();   

    var timerId = setInterval(function() {

      var now = new Date().getTime();
    
      var distance = countDownDate - now;
    
      var days = Math.floor(distance / (1000 * 60 * 60 * 24));
      var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      var seconds = Math.floor((distance % (1000 * 60)) / 1000);
    
      setTimer((days + "d " + hours + "h "
      + minutes + "m " + seconds + "s "));
    
      if (distance < 0) {
        clearInterval(timerId);
      }
    }, 1000);

    return () => {
      console.log("Called with:", timerId);
      
      clearInterval(timerId);
    }

  }, [end, tic]);

  const [state, setState] = useState({
    amount: undefined,
    error: undefined
  });
  const { callFlopDent } = useAuctionActions();
  const sortedEvents = events.sort(byTimestamp); // DEAL , [...DENT] , KICK ->

  const { bid: latestBid, lot: latestLot } = sortedEvents.find(
    event => event.type != 'Deal'
  );
  const hasAuctionCompleted = sortedEvents[0].type === 'Deal';

  const maxBid = new BigNumber(100); // This should be taken from somewhere?

  const handleTendCTA = value => {
    console.log('value', value);
    callFlopDent(auctionId, value, latestBid);
  };

  /**
   * disabled when:
   * - allowances & hopes not set
   * - 'deal' has been called (if deal event exists for auctionId)
   * - 'end' has passed
   * - MKR 'bid' is gt DAI 'lot' size
   * - MKR 'bid' is gte the current 'bid' (must be smaller by a certain % [3?])
   * - when the latest bid duration (ttl) has passed
   * - OR when the auction duration (tau) has passed.
   */
  const bidDisabled = state.error;

  return (
    <Grid
      gap={5}
      sx={{
        bg: '#fff',
        p: 6,
        borderRadius: 5,
        border: '1px solid',
        borderColor: 'border'
      }}
    >
      <Flex
        sx={{
          flexDirection: ['column', 'row'],
          justifyContent: 'space-between'
        }}
      >
        <Heading as="h5" variant="h2">
          Auction ID: {auctionId}
        </Heading>
        <Heading
          as="h5"
          variant="h2"
          sx={{
            pt: [2, 0],
            fontSize: 4,
            color: hasAuctionCompleted ? 'primaryHover' : 'text'
          }}
        >
          {hasAuctionCompleted
            ? 'Auction Completed'
            : `Time remaining: ${timer}`}
        </Heading>
      </Flex>
      <Box>
        <EventsList
          events={events.map(
            ({ type, ilk, lot, bid, timestamp, hash, fromAddress }, index) => {
              const eventBid = type === 'Deal' ? latestBid : bid;
              const eventLot = type === 'Deal' ? latestLot : lot;

              const currentBid = new BigNumber(eventLot).eq(new BigNumber(0))
                ? new BigNumber(eventLot)
                : new BigNumber(eventBid).div(new BigNumber(eventLot));

              return (
                <AuctionEvent
                  key={`${timestamp}-${index}`}
                  type={type}
                  ilk={ilk}
                  tx={hash}
                  sender={fromAddress}
                  lot={new BigNumber(eventLot).toFormat(5, 4)}
                  bid={new BigNumber(eventBid).toFormat(5, 4)}
                  currentBid={`${currentBid.toFormat(5, 4)} MKR`}
                  timestamp={
                    <Text title={new Date(timestamp)}>
                      <Moment fromNow ago>
                        {timestamp}
                      </Moment>{' '}
                      ago
                    </Text>
                  }
                />
              );
            }
          )}
        />
      </Box>
      <MiniFormLayout
        text={'Enter your bid in MKR for this Auction'}
        disabled={bidDisabled}
        inputUnit="MKR"
        onSubmit={handleTendCTA}
        small={'Price 1 MKR = 300 DAI'}
        actionText={'Bid Now'}
      />
      {/* <Grid gap={2}>
        <Text variant="boldBody"></Text>
        <Flex
          sx={{
            flexDirection: ['column', 'row']
          }}
        >
          <Flex
            sx={{
              maxWidth: ['100%', '224px'],
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'border',
              fontSize: 4,
              // lineHeight: '24px',
              py: 3,
              px: 5
            }}
          >
            <Input
              sx={{
                border: 'none',
                outline: 'none',
                p: 0,
                marginRight: '2'
              }}
              id="big-amount"
              type="number"
              step="0.01"
              placeholder="0"
              onChange={handleBidAmountInput}
            />
            <Label sx={{ p: 0, width: 'auto' }} htmlFor="bid-amount">
              MKR
            </Label>
          </Flex>
          <Button
            sx={{ ml: [0, 2], mt: [2, 0] }}
            variant="primary"
            disabled={bidDisabled}
          >
            Bid Now
          </Button>
        </Flex>
        {state.error && <Text variant="smallDanger">{state.error} </Text>}
        <Text variant="small"></Text>
      </Grid> */}
    </Grid>
  );
};
