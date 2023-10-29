/**
 * Cross platform IPC socket path
 * @param path
 */
export default function(path) {
  const prefix = (process.platform == 'win32') ? '//./pipe/' : '';

  if (prefix.endsWith('/') && path.startsWith('/')) {
    return prefix + path.substr(1);
  }

  return prefix + path;
}
