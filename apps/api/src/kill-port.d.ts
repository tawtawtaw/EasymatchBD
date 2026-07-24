declare module 'kill-port' {
  function killPort(port: number, protocol?: 'tcp' | 'udp'): Promise<void>;
  export default killPort;
}
