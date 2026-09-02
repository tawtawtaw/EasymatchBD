import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Dimensions,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from "react-native";

const FormKeyboardContext = createContext<(() => void) | null>(null);

export function useFormKeyboardFieldFocus() {
  return useContext(FormKeyboardContext);
}

function scrollFocusedFieldAboveKeyboard(
  scrollRef: { current: ScrollView | null },
  offsetY: number,
  keyboardTopY: number,
) {
  const input = TextInput.State.currentlyFocusedInput?.();
  if (!input || !scrollRef.current) {
    return;
  }

  input.measureInWindow((_: number, y: number, __: number, height: number) => {
    const gap = 20;
    const inputBottom = y + height;
    if (inputBottom + gap <= keyboardTopY) {
      return;
    }
    scrollRef.current?.scrollTo({
      y: Math.max(0, offsetY + (inputBottom + gap - keyboardTopY)),
      animated: true,
    });
  });
}

export function FormKeyboardScrollView({
  children,
  contentContainerStyle,
  onScroll,
  style,
  ...rest
}: ScrollViewProps & { children: ReactNode }) {
  const scrollRef = useRef<ScrollView>(null);
  const offsetY = useRef(0);
  const keyboardTopY = useRef(Dimensions.get("window").height);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const ensureFocusedFieldVisible = useCallback(() => {
    const run = () =>
      scrollFocusedFieldAboveKeyboard(scrollRef, offsetY.current, keyboardTopY.current);
    requestAnimationFrame(() => {
      setTimeout(run, Platform.OS === "android" ? 50 : 0);
    });
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const windowHeightBefore = Dimensions.get("window").height;

    const show = Keyboard.addListener(showEvent, (event) => {
      const height = event.endCoordinates.height;
      keyboardTopY.current = event.endCoordinates.screenY;
      const windowHeight = Dimensions.get("window").height;
      const windowDidResize = windowHeight < windowHeightBefore - 24;
      setKeyboardInset(windowDidResize ? 0 : height);
      ensureFocusedFieldVisible();
    });

    const hide = Keyboard.addListener(hideEvent, () => {
      keyboardTopY.current = Dimensions.get("window").height;
      setKeyboardInset(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, [ensureFocusedFieldVisible]);

  useEffect(() => {
    if (keyboardInset <= 0) {
      return;
    }
    ensureFocusedFieldVisible();
  }, [ensureFocusedFieldVisible, keyboardInset]);

  const flattened = StyleSheet.flatten(contentContainerStyle) ?? {};
  const basePaddingBottom = Number(flattened.paddingBottom ?? flattened.padding ?? 32);

  return (
    <FormKeyboardContext.Provider value={ensureFocusedFieldVisible}>
      <ScrollView
        {...rest}
        ref={scrollRef}
        style={style}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        scrollEventThrottle={16}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
          offsetY.current = event.nativeEvent.contentOffset.y;
          onScroll?.(event);
        }}
        contentContainerStyle={[contentContainerStyle, { paddingBottom: basePaddingBottom + keyboardInset }]}
      >
        {children}
      </ScrollView>
    </FormKeyboardContext.Provider>
  );
}
