//! Friendly symbol notation.

#![no_std]
#![forbid(unsafe_code)]
#![deny(missing_docs)]

use core::cmp::Reverse;
use core::fmt::{self, Debug, Formatter};

// Include symbol list.
include!("symbols.rs");

/// The default modifiers for tie-breaking.
const DEFAULTS: &[Modifier] = &[Modifier::new("r")];

/// Get a symbol by its symmy notation.
///
/// # Examples
/// ```
/// assert_eq!(symmie::get("pi"), Some('π'));
/// assert_eq!(symmie::get("in"), Some('∈'));
/// assert_eq!(symmie::get("arrow:l"), Some('←'));
/// assert_eq!(symmie::get("integral:ccw:cont"), Some('∳'));
/// assert_eq!(symmie::get("face:grin"), Some('😀'));
/// assert_eq!(symmie::get("turtle"), Some('🐢'));
/// assert_eq!(symmie::get("nonexistant"), None);
/// ```
pub fn get(notation: &str) -> Option<char> {
    let mut parts = notation.trim_matches(':').split(':');
    let mut array = [Modifier(0); 8];
    let mut modifiers: &[Modifier] = &[];

    // Decode into name and modifiers.
    let name = parts.next()?;
    for part in parts.take(array.len()) {
        let len = modifiers.len();
        array[len] = Modifier::new(part);
        modifiers = &array[..len + 1];
    }

    // Find the first table entry with this name.
    let start = match TABLE.binary_search_by_key(&name, |c| c.0) {
        Ok(i) => i,
        Err(i) => i,
    };

    let mut best = None;
    let mut best_score = None;

    // Find the best table entry with this name.
    for i in start..TABLE.len() {
        let candidate = TABLE[i];

        let mut candidate_parts = candidate.0.split(':');
        let candidate_name = candidate_parts.next();
        if candidate_name != Some(name) {
            break;
        }

        let mut matching = 0;
        let mut total = 0;
        let mut default = 0;

        for part in candidate_parts {
            let modifier = Modifier::new(part);
            if modifiers.contains(&modifier) {
                matching += 1;
            }
            if DEFAULTS.contains(&modifier) {
                default += 1;
            }
            total += 1;
        }

        let score = (matching, Reverse(total), default);
        if best_score.map_or(true, |b| score > b) {
            best = Some(candidate.1);
            best_score = Some(score);
        }
    }

    best
}

/// A modifier for a symbol
#[derive(Copy, Clone, Eq, PartialEq)]
struct Modifier(u64);

impl Modifier {
    /// Create a modifier from a string of length at most 8.
    const fn new(name: &str) -> Self {
        if name.len() > 8 {
            panic!("modifier name is too long");
        }

        let mut buf = [0u8; 8];
        let mut i = 0;
        while i < name.len() {
            buf[i] = name.as_bytes()[i];
            i += 1;
        }

        Self(u64::from_be_bytes(buf))
    }
}

impl Debug for Modifier {
    fn fmt(&self, f: &mut Formatter) -> fmt::Result {
        let bytes = self.0.to_be_bytes();
        let name = core::str::from_utf8(&bytes).unwrap();
        name.trim_end_matches('\0').fmt(f)
    }
}

#[cfg(test)]
mod tests {
    use super::get;

    #[test]
    fn test_get() {
        assert_eq!(get("arrow:u"), Some('\u{2191}'));
        assert_eq!(get("arrow"), Some('\u{2192}'));
        assert_eq!(get("face:grin"), Some('😀'));
        assert_eq!(get("in"), Some('∈'));
        assert_eq!(get("integral:ccw:cont"), Some('∳'));
        assert_eq!(get("nonexistant"), None);
        assert_eq!(get("pi"), Some('π'));
        assert_eq!(get("turtle"), Some('🐢'));
    }
}
