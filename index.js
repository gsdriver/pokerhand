//
// Main routine to evaluation a poker hand
//

module.exports = {
  // Evaluate a hand
  evaluateHand: function(cards, options) {
    const playerOptions = mapOptions(cards, options);
    const hand = createHandArray(cards, playerOptions);

    if (!hand) {
      return 'error';
    }

    const isFlush = isHandFlush(hand, playerOptions);
    const straightHiCard = getStraightHighCard(hand, playerOptions);
    const maxLikeCards = getMaxLikeCards(hand, playerOptions);

    // OK, let's see what we got - highest hand, 5-of-a-kind (with wild cards)
    if (maxLikeCards === 5) {
      return '5ofakind';
    }
    // Royal flush
    if (isFlush && (straightHiCard === 14) && (playerOptions.dontAllow.indexOf('royalflush') < 0)) {
      return 'royalflush';
    }
    // Straight flush
    if (isFlush && (straightHiCard > 0) && (playerOptions.dontAllow.indexOf('straightflush') < 0)) {
      return 'straightflush';
    }
    // 4-of-a-kind
    if ((maxLikeCards === 4) && (playerOptions.dontAllow.indexOf('4ofakind') < 0)) {
      return '4ofakind';
    }
    // Full House
    if (isHandFullHouse(hand, playerOptions) && (playerOptions.dontAllow.indexOf('fullhouse') < 0)) {
      return 'fullhouse';
    }
    // Flush
    if (isFlush && (playerOptions.dontAllow.indexOf('flush') < 0)) {
      return 'flush';
    }
    // Straight
    if ((straightHiCard > 0) && (playerOptions.dontAllow.indexOf('straight') < 0)) {
      return 'straight';
    }
    // 3-of-a-kind
    if ((maxLikeCards === 3) && (playerOptions.dontAllow.indexOf('3ofakind') < 0)) {
      return '3ofakind';
    }
    // 2-pair
    if (isHandTwoPair(hand, playerOptions) && (playerOptions.dontAllow.indexOf('2pair') < 0)) {
      return '2pair';
    }
    // 1-pair
    if ((maxLikeCards === 2) && (playerOptions.dontAllow.indexOf('pair') < 0)) {
      return 'pair';
    }

    // Nothing
    return 'nothing';
  },
};

// Maps the options (if any) to fill in default values
function mapOptions(cards, options) {
  const playerOptions = {aceCanBeLow: false,
    wildCards: ['JOKER'],
    cardsToEvaluate: 5,
    dontAllow: []};

  if (options) {
    if (options.hasOwnProperty('aceCanBeLow')) {
      playerOptions.aceCanBeLow = options.aceCanBeLow;
    }
    if (options.hasOwnProperty('cardsToEvaluate')) {
      playerOptions.cardsToEvaluate = options.cardsToEvaluate;
    }
    if (options.hasOwnProperty('dontAllow')) {
      let i;

      // These are the hands we don't allow (so don't consider these hands when
      // you are doing an evaluation)
      for (i = 0; i < options.dontAllow.length; i++) {
        playerOptions.dontAllow.push(options.dontAllow[i]);
      }
    }

    // Now map any wild cards - the array passed in can be a single rank (e.g. '2' or 'K')
    // or can be specific cards (e.g. 'JH', 'JD' for red jacks)
    // Either way, we will expand this to an array of individual cards
    if (options.hasOwnProperty('wildCards')) {
      let i;
      let exactCard;
      let value;

      for (i = 0; i < options.wildCards.length; i++) {
        // Ignore Joker - we already put that in
        if (options.wildCards[i].toUpperCase() !== 'JOKER') {
          exactCard = getRankAndSuit(options.wildCards[i]);
          if (exactCard) {
            playerOptions.wildCards.push(options.wildCards[i].toUpperCase());
          } else {
            // Not an exact card, so it should be just a rank
            value = getRank(options.wildCards[i]);
            if (value > 0) {
              playerOptions.wildCards.push(options.wildCards[i].toUpperCase() + 'C');
              playerOptions.wildCards.push(options.wildCards[i].toUpperCase() + 'D');
              playerOptions.wildCards.push(options.wildCards[i].toUpperCase() + 'H');
              playerOptions.wildCards.push(options.wildCards[i].toUpperCase() + 'S');
            }
          }
        }
      }
    }
  }

  // Oh, you can't have more than 5 (or cards.length) in the cardsToEvaluate
  if (playerOptions.cardsToEvaluate > cards.length) {
    playerOptions.cardsToEvaluate = cards.length;
  }
  if (playerOptions.cardsToEvaluate > 5) {
    playerOptions.cardsToEvaluate = 5;
  }
  return playerOptions;
}

// Given a string (e.g. '10' or 'J'), this function returns the rank, which 
// is a number from 1-14.  A return value of 0 indicates an error
function getRank(rankString) {
  const rankMapping = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  let rank = 0;

  if (rankString == '10') {
    rank = 10;
  } else if (rankString.length == 1) {
    // Rank is 2-9, J, Q, K, or A
    rank = rankMapping.indexOf(rankString.toUpperCase()) + 1;
    if (rank < 2) {
      // Nope, bad input
      rank = 0;
    }
  }

  return rank;
}

// Given a card string (e.g. '2s'), this function returns an object giving the
// rank and the suit, where rank is a number from 1-14 and suit from 0-3
function getRankAndSuit(card) {
  const result = {rank: 0, suit: 0};
  let suitString;
  const suitMapping = ['C', 'D', 'H', 'S'];

  if (card.substring(0, 2) == '10') {
    result.rank = 10;
    suitString = card.substring(2, card.length);
  } else if (card.length == 2) {
    result.rank = getRank(card.substring(0, 1));
    if (result.rank < 2) {
      // Nope, bad input
      return null;
    }

    suitString = card.substring(1, 2);
  } else {
    // Bad input
    return null;
  }

  // OK, we set the rank, now find a suit
  result.suit = suitMapping.indexOf(suitString.toUpperCase());
  if (result.suit < 0) {
    // Sorry, bad suit
    return null;
  }

  // OK, return the card
  return result;
}

// This function maps the array of player cards into data in the result object:
//   1) Suits: An array giving the number of clubs, diamonds, hearts, and spades (in that order)
//   2) Rank: An array giving the number of cards of each rank;
//            if Aces can be low they are counted twice (position 0 and 14)
//   3) WildCards: The number of wild cards in the hand.
//                 Note wildcards do NOT go into the above arrays
function createHandArray(cards, options) {
  let i;
  let card;
  const result = {suits: [0, 0, 0, 0],
    rank: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    wildCards: 0};

  for (i = 0; i < cards.length; i++) {
    // First check if this string is in the list of wildcards
    if (options.wildCards.indexOf(cards[i].toUpperCase()) >= 0) {
      // We have a wild card!
      result.wildCards++;
    } else {
      // Get the rank and the suit
      card = getRankAndSuit(cards[i]);
      if (!card) {
        // Bad input
        return null;
      }

      // BUGBUG - we should check that this isn't a duplicate card
      result.suits[card.suit]++;
      result.rank[card.rank - 1]++;
      if ((card.rank == 14) && options.aceCanBeLow) {
        // This is an ace - it can also be low
        result.rank[0]++;
      }
    }
  }

  // OK, let's do it
  return result;
}

// Determines whether a hand is a flush or not
function isHandFlush(hand, options) {
  let i = 0;
  let maxCardsInSuit = 0;

  for (i = 0; i < hand.suits.length; i++) {
    if (hand.suits[i] > maxCardsInSuit) {
      maxCardsInSuit = hand.suits[i];
    }
  }

  // Add in wildcards
  maxCardsInSuit += hand.wildCards;
  return (maxCardsInSuit >= options.cardsToEvaluate);
}

// Determines whether a hand is a striaght or not, returning
// the high card in that striaght.  If the hand is not a striaght,
// then this function returns 0

function getStraightHighCard(hand, options) {
  let hiCard = 0;
  let i;
  let curRun = 0;
  let wildRun = hand.wildCards;

  for (i = 0; i < hand.rank.length; i++) {
    if (hand.rank[i]) {
      // OK, add to the current run
      curRun++;
    } else {
      // If there are wild cards, they can be used here
      if ((curRun > 0) && (wildRun > 0)) {
        wildRun--;
        curRun++;
      } else {
        // The current run is over
        if (curRun >= options.cardsToEvaluate) {
          // And it's a straight!
          hiCard = i;
        }

        curRun = 0;
        wildRun = hand.wildCards;
      }
    }
  }

  // It's possible that we have an Ace-high straight, or that
  // wild cards could be used to complete an Ace-high straight
  if ((curRun + wildRun) >= options.cardsToEvaluate) {
    // Ace-high striaght!
    hiCard = hand.rank.length;
  }

  // Did we get as many as we needed in a row?
  return hiCard;
}

// Returns the maximum number of like cards (pair, three of a kind, etc)
function getMaxLikeCards(hand, options) {
  let i;
  let maxLike = 0;

  // Go thru and see what the maximum number of like cards is
  for (i = 0; i < hand.rank.length; i++) {
    if (hand.rank[i] > maxLike) {
      maxLike = hand.rank[i];
    }
  }

  // Add in wild cards
  maxLike += hand.wildCards;
  if (maxLike > hand.cardsToEvaluate) {
    maxLike = hand.cardsToEvaluate;
  }

  return maxLike;
}

function isHandFullHouse(hand, options) {
  // You need 5 cards to evaluate to make a full house
  if (hand.cardsToEvaluate < 5) {
    return false;
  }

  // OK, we need 3 and 2 - start by checking if we have a three in the array
  if (hand.rank.indexOf(3) >= 0) {
    // OK, we have three of a kind (natural) - now look for a pair
    // No need to look for wild cards; they ain't got any if we got this
    // far as we already checked for 4-of-a-kind which beats Full House
    if (hand.rank.indexOf(2) >= 0) {
      // Natural full house!
      return true;
    }
  } else if (hand.wildCards > 0) {
    // OK, they have wild cards; they can't have three wild cards (else it's 4-of-a-kind)
    // and they can't have two - that would require a natural paid which would be 4-of-a-kind
    // So we just need to check for two pairs (natural) - and that's just what isHandTwoPair does
    if (isHandTwoPair(hand, options)) {
      return true;
    }
  }

  // Guess they ain't got it
  return false;
}

function isHandTwoPair(hand, options) {
  // No need to check for wild cards - because any wild cards would make this a better hand
  // than just two pair
  let i;
  let pair = 0;

  for (i = 0; i < hand.rank.length; i++) {
    if (hand.rank[i] === 2) {
        pair++;
    }
  }

  return (pair >= 2);
}
